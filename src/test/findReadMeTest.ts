// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { findReadMe } from "../findReadMe"
import * as assert from "assert"

describe("findReadMe()", () => {
    it("./", async () => {
        const readMePath = await findReadMe("./")
        assert.notStrictEqual(readMePath, undefined)
    })
    it("test/", async () => {
        const readMePath = await findReadMe("./test")
        assert.notStrictEqual(readMePath, undefined)
    })
    it("/", async () => {
        const readMePath = await findReadMe("/")
        assert.strictEqual(readMePath, undefined)
    })
    it("url", async () => {
        const url =
            "https://github.com/Azure/azure-rest-api-specs/blob/master/specification/network/resource-manager/Microsoft.Network/stable/2018-08-01"
        const readMePath = await findReadMe(url)
        assert.strictEqual(
            readMePath,
            "https://github.com/Azure/azure-rest-api-specs/blob/master/specification/network/resource-manager/readme.md"
        )
    })
    it("url none", async () => {
        const url =
            "https://github.com/Azure/azure-rest-api-specs"
        const readMePath = await findReadMe(url)
        assert.strictEqual(readMePath, undefined)
    })
})
