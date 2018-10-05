// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { findReadMe } from "../findReadMe"
import * as assert from "assert"

describe("findReadMe()", () => {
    it("./", () => {
        const readMePath = findReadMe("./")
        assert.notStrictEqual(readMePath, undefined)
    })
    it("test/", () => {
        const readMePath = findReadMe("./test")
        assert.notStrictEqual(readMePath, undefined)
    })
    it("/", () => {
        const readMePath = findReadMe("/")
        assert.strictEqual(readMePath, undefined)
    })
})
