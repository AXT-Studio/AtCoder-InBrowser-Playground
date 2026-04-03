# Python

AIBPは、Pythonを対応するプログラミング言語としてサポートしています。

## テストコード実行環境の差異

AIBPのPythonコードの実行環境は、AtCoderのジャッジ環境と一部異なる挙動を示します。
以下に、主な差異をまとめます。

### 使えるライブラリの制限

AtCoderのジャッジ環境で使用できるライブラリのうち、以下のライブラリはAIBPのPythonコードの実行環境では利用できません。

- PuLP
- acl-cpp-python
- cppyy
- more-itertools
- pandas
- scikit-learn
- shapely
- z3-solver

なお、以下のAtCoderのジャッジ環境で使用できるライブラリは、AIBPのPythonコードの実行環境でも利用できます。

- ac-library-python
- bitarray
- mpmath
- networkx
- numpy
- scipy
- sortedcontainers
- sympy

## Codon非対応

AIBPのPythonコードの実行環境は、CPythonをベースにしたものを使用しています。
このため、Codon特有の挙動などは再現できません。
AIBPでコードをテストする場合は、そのコードをCPythonまたはPyPyで提出するものとして書く必要があります。
