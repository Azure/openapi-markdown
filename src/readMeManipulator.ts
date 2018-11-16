// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import * as commonmark from "commonmark"
import { ReadMeBuilder } from "./readMeBuilder"
import { Logger } from "./logger"
import * as yaml from "js-yaml"
import { base64ToString } from "./gitHubUtils"
import { MarkDownEx, markDownExToString, parse } from "@ts-common/commonmark-to-markdown"

/**
 * Examples:
 * - https://github.com/Azure/azure-rest-api-specs/blob/4c2be7a9983963a75e15c579e4fc8d17e547ea69/specification/guestconfiguration/resource-manager/readme.md#suppression
 * - https://github.com/Azure/azure-rest-api-specs/blob/32b0d873aa851d456dfde7d6ba1d89ff33f897f0/specification/azsadmin/resource-manager/user-subscriptions/readme.md#suppression
 */
export interface SuppressionItem {
    suppress: string
    reason?: string
    where: string|ReadonlyArray<string>
    from?: string|ReadonlyArray<string>
}

export interface Suppression {
    directive: SuppressionItem[];
}

/**
 * Provides operations that can be applied to readme files
 */
export class ReadMeManipulator {
    constructor(private logger: Logger, private readMeBuilder: ReadMeBuilder) { }

    /**
     * Updates the latest version tag of a readme
     */
    public updateLatestTag(markDownEx: MarkDownEx, newTag: string): string {
        const startNode = markDownEx.markDown
        const codeBlockMap = getCodeBlocksAndHeadings(startNode)

        const latestHeader = "Basic Information"

        const lh = codeBlockMap[latestHeader]
        if (lh === undefined) {
            this.logger.error(`Couldn't parse code block`)
            throw new Error("")
        }
        const latestDefinition = yaml.load(lh.literal!) as
            | undefined
            | { tag: string }

        if (!latestDefinition) {
            this.logger.error(`Couldn't parse code block`)
            throw new Error("")
        }

        latestDefinition.tag = newTag

        lh.literal = yaml.dump(latestDefinition, {
            lineWidth: -1
        })

        return markDownExToString(markDownEx)
    }

    public insertTagDefinition(
        readmeContent: string,
        tagFiles: string[],
        newTag: string
    ) {
        const newTagDefinitionYaml = createTagDefinitionYaml(tagFiles)

        const toSplice = this.readMeBuilder.getVersionDefinition(
            newTagDefinitionYaml,
            newTag
        )

        return spliceIntoTopOfVersions(readmeContent, toSplice)
    }

    public addSuppressionBlock(readme: string) {
        return `${readme}\n\n${this.readMeBuilder.getSuppressionSection()}`
    }
}

export const addSuppression = (
    startNode: commonmark.Node,
    item: SuppressionItem
): void => {
    const mapping = getCodeBlocksAndHeadings(startNode)
    const suppressionNode = mapping.Suppression
    if (suppressionNode === undefined) {
        // probably it's a bug
        return
    }
    const suppressionBlock = getYamlFromNode(suppressionNode)
    const updatedSuppressionBlock = {
        ...suppressionBlock,
        directive: [...suppressionBlock.directive, item]
    }
    updateYamlForNode(suppressionNode, updatedSuppressionBlock)
}

export const base64ToMarkDownEx = (base: string): MarkDownEx => {
    const str = base64ToString(base)
    return parse(str)
}

export const getYamlFromNode = (node: commonmark.Node) => {
    const infoYaml: any = yaml.load(node.literal!)
    return infoYaml
}

const updateYamlForNode = (node: commonmark.Node, yamlObject: any): void => {
    node.literal = yaml.dump(yamlObject, { lineWidth: -1 })
}

const spliceIntoTopOfVersions = (file: string, splice: string) => {
    const index = file.indexOf("### Tag")
    return file.slice(0, index) + splice + file.slice(index)
}

const createTagDefinitionYaml = (files: string[]) => ({
    ["input-file"]: files
})

export const hasSuppressionBlock = (startNode: commonmark.Node) => {
    const mapping = getCodeBlocksAndHeadings(startNode)
    return !!mapping.Suppression
}

export interface CodeBlocksAndHeadings {
    readonly Suppression?: commonmark.Node
    readonly [key: string]: commonmark.Node|undefined
}

export const getCodeBlocksAndHeadings = (
    startNode: commonmark.Node
): CodeBlocksAndHeadings => {
    return getAllCodeBlockNodes(startNode).reduce(
        (acc, curr) => {
            const headingNode = nodeHeading(curr)

            if (!headingNode) {
                return { ...acc }
            }

            const headingLiteral = getHeadingLiteral(headingNode);

            if (!headingLiteral) {
                return { ...acc }
            }

            return { ...acc, [headingLiteral]: curr }
        },
        {}
    )
}

const getHeadingLiteral = (heading: commonmark.Node): string => {
    const headingNode = walkToNode(
        heading.walker(),
        n => n.type === "text"
    )

    return headingNode && headingNode.literal ? headingNode.literal : ""
}

const getAllCodeBlockNodes = (startNode: commonmark.Node) => {
    const walker = startNode.walker()
    const result: commonmark.Node[] = []
    while (true) {
        const a = walkToNode(walker, n => n.type === "code_block")
        if (!a) {
            break
        }
        result.push(a)
    }
    return result
}

const nodeHeading = (startNode: commonmark.Node): commonmark.Node | null => {
    let resultNode: commonmark.Node | null = startNode

    while (resultNode != null && resultNode.type !== "heading") {
        resultNode = resultNode.prev || resultNode.parent
    }

    return resultNode
}

/**
 * walks a markdown tree until the callback provided returns true for a node
 */
const walkToNode = (
    walker: commonmark.NodeWalker,
    cb: (node: commonmark.Node) => boolean
): commonmark.Node | undefined => {
    let event = walker.next()

    while (event) {
        const curNode = event.node
        if (cb(curNode)) {
            return curNode
        }
        event = walker.next()
    }
    return undefined
}
