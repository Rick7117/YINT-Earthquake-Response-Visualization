from abc import ABC, abstractmethod
from typing import Generic, TypeVar

InputType = TypeVar("InputType")
OutputType = TypeVar("OutputType")


class UseCase(Generic[InputType, OutputType], ABC):
    """Base transaction class"""

    @abstractmethod
    def run(self, input_data: InputType) -> OutputType:
        """Execute the transaction with the given input data"""
        pass
