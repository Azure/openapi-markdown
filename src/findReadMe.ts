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

const fsReadFile = (pathStr: string): Promise<Buffer> =>
  new Promise((resolve, reject) => fs.readFile(
    pathStr,
    (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    }))

const httpsGetBody = async (pathStr: string): Promise<string> => {
    const message = await httpsGet(pathStr)
    return new Promise<string>((resolve, reject) => {
        let body = ""
        message.on("data", chunk => body += chunk)
        message.on("end", () => resolve(body))
        message.on("error", err => reject(err))
    })
}

export const readFile = async (pathStr: string): Promise<string> => {
    const result = urlParse(pathStr)
    return result === undefined ?
        (await fsReadFile(pathStr)).toString() :
        await httpsGetBody(pathStr)
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
    new Promise((resolve, reject) => https.get(url, resolve).on("error", error => reject(error)))

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

const pathDirName = (dir: string): string => {
    const url = urlParse(dir)
    if (url === undefined) {
        return path.dirname(dir)
    }
    const split = url.path.split("/")
    return toUrlString({
        protocol: url.protocol,
        path: split.length <= 1 ? url.path : it.join(it.dropRight(split), "/")
    })
}

/**
 * It may throw an exception if `dir` is URL and network is not available.
 *
 * @param dir
 */
export const findReadMe = async (dir: string): Promise<string | undefined> => {
    dir = pathResolve(dir)
    while (true) {
        const fileName = pathJoin(dir, "readme.md")
        if (await fsExists(fileName)) {
            return fileName
        }
        const newDir = pathDirName(dir)
        if (newDir === dir) {
            return undefined
        }
        dir = newDir
    }
}
