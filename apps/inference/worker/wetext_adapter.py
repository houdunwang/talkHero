# Copyright (c) 2022-2024 Zhendong Peng
# Licensed under the Apache License, Version 2.0.
"""Inference-only WeTextProcessing adapter for fixed local TN FST files."""

from __future__ import annotations

import re
import string
from pathlib import Path

from kaldifst import TextNormalizer

EOS = "<EOS>"
ZH_ORDERS = {
    "date": ["year", "month", "day"],
    "fraction": ["denominator", "numerator"],
    "measure": ["denominator", "numerator", "value"],
    "money": ["value", "currency"],
    "time": ["noon", "hour", "minute", "second"],
}
EN_ORDERS = {
    "date": ["preserve_order", "text", "day", "month", "year"],
    "money": ["integer_part", "fractional_part", "quantity", "currency_maj"],
}


class _Token:
    def __init__(self, name: str) -> None:
        self.name = name
        self.order: list[str] = []
        self.members: dict[str, str] = {}

    def append(self, key: str, value: str) -> None:
        self.order.append(key)
        self.members[key] = value

    def render(self, orders: dict[str, list[str]]) -> str:
        order = self.order
        if self.name in orders and self.members.get("preserve_order") != "true":
            order = orders[self.name]
        fields = "".join(
            f' {key}: "{self.members[key]}"' for key in order if key in self.members
        )
        return f"{self.name} {{{fields} }}"


class _TokenParser:
    def __init__(self, language: str) -> None:
        if language not in ("en", "zh"):
            raise ValueError("WeTextProcessing 仅允许中英文 TN")
        self.orders = EN_ORDERS if language == "en" else ZH_ORDERS
        self.text = ""
        self.index = 0
        self.character = EOS
        self.tokens: list[_Token] = []

    def _read(self) -> bool:
        if self.index < len(self.text) - 1:
            self.index += 1
            self.character = self.text[self.index]
            return True
        self.character = EOS
        return False

    def _whitespace(self) -> bool:
        active = self.character != EOS
        while active and self.character == " ":
            active = self._read()
        return active

    def _character(self, expected: str) -> bool:
        if self.character != expected:
            return False
        self._read()
        return True

    def _characters(self, expected: str) -> None:
        for character in expected:
            self._character(character)

    def _key(self) -> str:
        if self.character == EOS or self.character in string.whitespace:
            raise ValueError("WeTextProcessing token key 无效")
        key = ""
        while self.character in string.ascii_letters + "_":
            key += self.character
            self._read()
        return key

    def _value(self) -> str:
        if self.character == EOS:
            raise ValueError("WeTextProcessing token value 无效")
        value = ""
        while self.character != '"':
            value += self.character
            escaped = self.character == "\\"
            if not self._read():
                raise ValueError("WeTextProcessing token value 未闭合")
            if escaped:
                value += self.character
                self._read()
        return value

    def reorder(self, value: str) -> str:
        if not value:
            raise ValueError("WeTextProcessing token 为空")
        self.text = value
        self.index = 0
        self.character = value[0]
        self.tokens = []
        while self._whitespace():
            token = _Token(self._key())
            self._characters(" { ")
            while self._whitespace():
                if self._character("}"):
                    break
                key = self._key()
                self._characters(': "')
                field = self._value()
                self._character('"')
                token.append(key, field)
            self.tokens.append(token)
        return " ".join(token.render(self.orders) for token in self.tokens)


class LocalNormalizer:
    """Normalize one language with caller-supplied, immutable local FSTs."""

    def __init__(self, tagger_path: Path, verbalizer_path: Path, language: str) -> None:
        if language not in ("en", "zh"):
            raise ValueError("WeTextProcessing 仅允许中英文 TN")
        self.language = language
        self.tagger = TextNormalizer(str(tagger_path))
        self.verbalizer = TextNormalizer(str(verbalizer_path))

    def normalize(self, text: str) -> str:
        if not re.search(r"\d", text):
            return text
        tagged = self.tagger(text)
        ordered = _TokenParser(self.language).reorder(tagged)
        return self.verbalizer(ordered)
