// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import * as vfs from "@ts-common/virtual-fs"

/**
 * It may throw an exception if `dir` is URL and network is not available.
 *
 * @param dir
 */
export const findReadMe = async (dir: string): Promise<string | undefined> => {
    dir = vfs.pathResolve(dir)
    while (true) {
        const fileName = vfs.pathJoin(dir, "readme.md")
        if (await vfs.exists(fileName)) {
            return fileName
        }
        const newDir = vfs.pathDirName(dir)
        if (newDir === dir) {
            return undefined
        }
        dir = newDir
    }
}
