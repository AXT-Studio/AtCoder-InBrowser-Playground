import { describe, expect, it } from "vitest";
import { extractImports } from "./extractImports";

describe("extractImports", () => {
    it("import / from をトップレベル名に畳む", () => {
        expect(
            extractImports(`
import numpy as np
import bitarray, sortedcontainers
from sympy import Symbol
from more_itertools import chunked
from atcoder.dsu import DSU
`),
        ).toEqual(["atcoder", "bitarray", "more_itertools", "numpy", "sortedcontainers", "sympy"]);
    });

    it("相対 import と __future__ は無視する", () => {
        expect(
            extractImports(`
from __future__ import annotations
from . import local_mod
from ..pkg import x
import os
`),
        ).toEqual(["os"]);
    });

    it("コメント・トリプルクォート内の偽 import を拾わない", () => {
        expect(
            extractImports(`
# import numpy
print("""
import scipy
""")
import networkx
`),
        ).toEqual(["networkx"]);
    });
});
