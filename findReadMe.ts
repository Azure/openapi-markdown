// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import * as path from "path"
import * as fs from "fs"
import * as https from "https"
import { IncomingMessage } from 'http'
import * as it from "@ts-common/iterator"

interface Url {
    readonly protocol: string
    readonly path: string
}

const protocolSeparator = "://"

const toUrlString = (url: Url) => url.protocol + protocolSeparator + url.path

export const urlParse = (dir: string): Url|undefined => {
    const split = dir.split(protocolSeparator)
    return split.length === 2 ? {
        protocol: split[0],
        path: split[1]
    } : undefined
}

const pathResolve = (dir: string): string =>
    urlParse(dir) !== undefined ? dir : path.resolve(dir)

const pathJoin = (dir: string, value: string): string => {
    const url = urlParse(dir)
    return url !== undefined ?
        toUrlString({
            protocol: url.protocol,
            path: it.join(it.concat(url.path.split("/"), [value]), "/")
        }) :
        path.join(dir, value)
}

export const httpsGet = (url: string): Promise<IncomingMessage> =>
    new Promise(resolve => https.get(url, resolve))

const fileExists = async (dir: string): Promise<boolean> =>
    new Promise<boolean>(resolve => fs.exists(dir, resolve))

const fsExists = async (dir: string): Promise<boolean> => {
    if (urlParse(dir) !== undefined) {
        const result = await httpsGet(dir)
        return result.statusCode === 200
    } else {
        return fileExists(dir)
    }
}

export const findReadMe = async (dir: string): Promise<string | undefined> => {
    dir = pathResolve(dir)
    while (true) {
        const fileName = pathJoin(dir, "readme.md")
        if (await fsExists(fileName)) {
            return fileName
        }
        const newDir = path.dirname(dir)
        if (newDir === dir) {
            return undefined
        }
        dir = newDir
    }
}
