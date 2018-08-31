// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

export const base64ToString = (base: string): string =>
    Buffer.from(base, "base64").toString("utf8")

