import requests
import json
import pandas as pd
from tqdm import tqdm
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import partial

def fetch_data_from_qdrant():
    """从Qdrant获取所有数据"""
    print("从Qdrant获取数据...")
    response = requests.post(
        'http://localhost:6333/collections/earthquake_messages/points/scroll',
        json={
            'limit': 10000,
            'with_payload': True,
            'with_vector': False
        }
    )
    if response.status_code != 200:
        raise Exception(f"HTTP error! status: {response.status_code}")
    
    data = response.json()
    points = data['result']['points']
    print(points[0])
    print(f"获取到 {len(points)} 条数据")
    return points

def load_categories():
    """加载分类数据"""
    print("加载分类数据...")
    with open('./data/categories.json', 'r', encoding='utf-8') as f:
        categories = json.load(f)
    return categories

def get_all_category_terms(categories):
    """获取所有类别词条"""
    terms = []
    for main_cat, sub_cats in categories.items():
        terms.extend(sub_cats)
    return terms

def search_similarity(term):
    """搜索单个词条的相似度"""
    try:
        search_response = requests.get(
            f'http://127.0.0.1:8000/search/vector',
            params={
                'query': term,
                'limit': 10000  # 获取所有数据
            }
        )
        # print(len(search_response.json()['results']))
        if search_response.ok:
            search_data = search_response.json()
            if search_data['results'] and len(search_data['results']) > 0:
                # 返回所有结果
                matches = []
                for result in search_data['results']:
                    score = result.get('score', 0)
                    # 使用time和account作为唯一标识
                    key = f"{result['time']}_{result['account']}"
                    matches.append((key, score))
                return matches
    except Exception as e:
        print(f"计算相似度失败: {e}")
        print(f"搜索词条: {term}")
        if 'search_response' in locals():
            print(f"响应内容: {search_response.text}")
    return []

def process_data(points):
    """处理数据"""
    processed_data = []
    
    # 加载分类数据
    categories = load_categories()
    category_terms = get_all_category_terms(categories)
    print(f"加载了 {len(category_terms)} 个类别词条")
    
    # 构建子分类到主分类的映射
    sub_to_main_map = {}
    for main_cat, sub_cats in categories.items():
        for sub_cat in sub_cats:
            sub_to_main_map[sub_cat.lower()] = main_cat
    
    # 为每个消息创建一个字典，用于存储其标签和相似度
    message_to_labels = {}
    for point in points:
        key = f"{point['payload']['time']}_{point['payload']['account']}"
        message_to_labels[key] = {
            'time': point['payload']['time'],
            'location': point['payload']['location'],
            'account': point['payload']['account'],
            'message': point['payload']['message'],
            'label': None,
            'best_score': -1,
            'main_category': None
        }
    
    print(f"初始化消息字典: {len(message_to_labels)} 条")
    
    # 并行搜索所有类别词条
    with ThreadPoolExecutor(max_workers=30) as executor:
        # 提交所有搜索任务
        future_to_term = {executor.submit(search_similarity, term): term for term in category_terms}
        
        # 使用tqdm显示进度
        total_matches = 0
        for future in tqdm(as_completed(future_to_term), total=len(category_terms), desc="处理类别"):
            term = future_to_term[future]
            matches = future.result()
            total_matches += len(matches)
            
            # 处理每个匹配结果
            for key, score in matches:
                if key in message_to_labels:
                    # 如果当前相似度更高，更新标签
                    if score > message_to_labels[key]['best_score']:
                        sub_category = term.lower()
                        main_category = sub_to_main_map.get(sub_category, '未分类')
                        message_to_labels[key]['label'] = sub_category
                        message_to_labels[key]['best_score'] = score
                        message_to_labels[key]['main_category'] = main_category
        
        print(f"总匹配数: {total_matches}")
    
    # 统计有标签和无标签的消息数
    labeled_count = 0
    unlabeled_count = 0
    for key, data in message_to_labels.items():
        if data['label']:
            labeled_count += 1
            processed_data.append(data)
        else:
            unlabeled_count += 1
    
    print(f"有标签的消息数: {labeled_count}")
    print(f"无标签的消息数: {unlabeled_count}")
    
    return processed_data

def remove_duplicates(data):
    """去重处理"""
    unique_data = {}
    for item in data:
        key = f"{item['time']}_{item['account']}"
        if key not in unique_data:
            unique_data[key] = item
    
    return list(unique_data.values())

def main():
    try:
        # 1. 获取数据
        points = fetch_data_from_qdrant()
        
        # 2. 处理数据
        processed_data = process_data(points)
        print(f"处理完成，共 {len(processed_data)} 条数据")
        
        # 3. 去重
        final_data = remove_duplicates(processed_data)
        print(f"去重后剩余 {len(final_data)} 条数据")
        
        # 4. 转换为DataFrame并保存为CSV
        df = pd.DataFrame(final_data)
        output_path = './data/YInt_w_label.csv'
        df.to_csv(output_path, index=False, encoding='utf-8')
        print(f"数据已保存到: {output_path}")
        
        # 5. 打印一些统计信息
        print("\n标签统计:")
        print(df['label'].value_counts())
        
        print("\n主分类统计:")
        print(df['main_category'].value_counts())
        
    except Exception as e:
        print(f"处理失败: {e}")

def test_process_csv():
    """测试处理CSV文件中的前100条数据"""
    try:
        print("开始测试处理CSV数据...")
        
        # 1. 读取CSV文件的前100条数据
        df = pd.read_csv('./data/YInt_w_label.csv', nrows=100)
        print(f"读取到 {len(df)} 条数据")
        
        # 2. 转换为points格式
        points = []
        for _, row in df.iterrows():
            point = {
                'payload': {
                    'time': row['time'],
                    'location': row['location'],
                    'account': row['account'],
                    'message': row['message']
                }
            }
            points.append(point)
        
        # 3. 处理数据
        processed_data = process_data(points)
        print(f"处理完成，共 {len(processed_data)} 条数据")
        
        # 4. 转换为DataFrame并保存为CSV
        result_df = pd.DataFrame(processed_data)
        output_path = './data/test_processed_data.csv'
        result_df.to_csv(output_path, index=False, encoding='utf-8')
        print(f"测试数据已保存到: {output_path}")
        
        # 5. 打印一些统计信息
        print("\n测试数据标签统计:")
        all_labels = []
        for labels in result_df['best_label']:
            all_labels.extend(labels)
        print(pd.Series(all_labels).value_counts())
        
        print("\n测试数据主分类统计:")
        all_main_categories = []
        for categories in result_df['main_category']:
            all_main_categories.extend(categories)
        print(pd.Series(all_main_categories).value_counts())
        
    except Exception as e:
        print(f"测试处理失败: {e}")

if __name__ == "__main__":
    main()  # 运行主函数 