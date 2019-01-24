// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import "mocha"

import * as chai from "chai"
import * as cm2md from "@ts-common/commonmark-to-markdown"

import { ReadMeBuilder } from "../readMeBuilder"
import { ReadMeManipulator, getCodeBlocksAndHeadings, addSuppression } from "../readMeManipulator"
import { Logger } from '../logger';

// const reader = new commonmark.Parser();
const parsed = cm2md.parse(
  unescape(`
## Configuration

### Basic Information

These are the global settings for the Cdn API.

\`\`\`yaml
openapi-type: arm
tag: package-2017-10
\`\`\`

### Tag: package-2017-10

These settings apply only when \`--tag=package-2017-10\` is specified on the command line.

\`\`\`yaml $(tag) == 'package-2017-10'
input-file:
- Microsoft.Cdn/stable/2017-10-12/cdn.json
\`\`\`

### Tag: package-2017-04

These settings apply only when \`--tag=package-2017-04\` is specified on the command line.

\`\`\`yaml $(tag) == 'package-2017-04'
input-file:
- Microsoft.Cdn/stable/2017-04-02/cdn.json
\`\`\`
`)
);

const readmeBuilder = new ReadMeBuilder();

const logger: Logger = {
  error: () => {}
}

describe("@fast ReadmeManipulator.getAllTags", () => {
  it("should get all the tags from the given spec", async () => {
    const rm = new ReadMeManipulator(logger, readmeBuilder);

    const updated = rm.getAllTags(parsed);

    chai.expect(updated).to.deep.equal([
      "package-2017-10", "package-2017-04"
    ]);
  });
});

describe("@fast ReadmeManipulator.getTagsForFilesChanged", () => {
  it("should identify tags that are related to given spec", async () => {
    const rm = new ReadMeManipulator(logger, readmeBuilder);

    const updated = rm.getTagsForFilesChanged(parsed, [
      "specifications/test/Microsoft.Cdn/stable/2017-10-12/cdn.json"
    ]);

    chai.expect(updated).to.deep.equal(["package-2017-10"]);
  });

  it("should identify tags that are related to given specs", async () => {
    const rm = new ReadMeManipulator(logger, readmeBuilder);

    const updated = rm.getTagsForFilesChanged(parsed, [
      "specifications/test/Microsoft.Cdn/stable/2017-10-12/cdn.json",
      "specifications/test/Microsoft.Cdn/stable/2017-04-02/cdn.json"
    ]);

    chai.expect(updated).to.deep.equal(["package-2017-10", "package-2017-04"]);
  });
});

describe("@fast ReadmeManipulator.updateVersionTag", () => {
  it("should correctly update readme", async () => {
    const rm = new ReadMeManipulator(logger, readmeBuilder);

    const updated = rm.updateLatestTag(parsed, "package-2018-10");

    chai.expect(updated).to.contain("tag: package-2018-10");
  });

  it("should correctly update readme", async () => {
    const asa = await getCodeBlocksAndHeadings(parsed.markDown);
    chai
      .expect(asa)
      .to.have.all.keys([
        "Basic Information",
        "Tag: package-2017-04",
        "Tag: package-2017-10"
      ]);
  });

  it("should correctly parse directive", async () => {
    const asdf = cm2md.parse(
      unescape(`

### Basic Information
These are the global settings for the Subscriptions API.

\`\`\` yaml
title: SubscriptionsAdminClient
description: Subscriptions Admin Client
openapi-type: arm
tag: package-2015-11-01
\`\`\`


## Suppression
\`\`\` yaml
directive:
  - suppress: XmsResourceInPutResponse
    reason: Subscription and Location are not modelled as ARM resources in azure for legacy reasons. In Azure stack as well, Subscription and Location are not modelled as ARM resource for azure consistency
    where:
      - $.paths["/subscriptions/{subscriptionId}/providers/Microsoft.Subscriptions.Admin/subscriptions/{subscription}"].put
      - $.paths["/subscriptions/{subscriptionId}/providers/Microsoft.Subscriptions.Admin/subscriptions/{targetSubscriptionId}/acquiredPlans/{planAcquisitionId}"].put
      - $.paths["/subscriptions/{subscriptionId}/providers/Microsoft.Subscriptions.Admin/locations/{location}"].put

  - suppress: SubscriptionIdParameterInOperations
    reason: Subscription is the main resource in the API spec and it should not be masked in global parameters.
    where:
      - $.paths[\"/subscriptions/{subscriptionId}\"].get.parameters[0]
      - $.paths[\"/subscriptions/{subscriptionId}\"].put.parameters[0]
      - $.paths[\"/subscriptions/{subscriptionId}\"].delete.parameters[0]

  - suppress: BodyTopLevelProperties
    reason: Subscription is not modelled as ARM resource in azure for legacy reasons. In Azure stack as well, Subscription is not modelled as ARM resource for azure consistency.
    where:
      - $.definitions.Subscription.properties
      - $.definitions.PlanAcquisition.properties
      - $.definitions.Location.properties

  - suppress: RequiredPropertiesMissingInResourceModel
    reason: Subscription is not modelled as ARM resource in azure for legacy reasons. In Azure stack as well, Subscription is not modelled as ARM resource for azure consistency.
    where:
      - $.definitions.Subscription
      - $.definitions.PlanAcquisition
      - $.definitions.Location
\`\`\`

### Tag: package-2015-11-01

These settings apply only when \`--tag=package-2015-11-01\` is specified on the command line.

\`\`\` yaml $(tag) == 'package-2015-11-01'
input-file:
    - Microsoft.Subscriptions.Admin/preview/2015-11-01/Subscriptions.json
    - Microsoft.Subscriptions.Admin/preview/2015-11-01/AcquiredPlan.json
    - Microsoft.Subscriptions.Admin/preview/2015-11-01/DelegatedProvider.json
    - Microsoft.Subscriptions.Admin/preview/2015-11-01/DelegatedProviderOffer.json
    - Microsoft.Subscriptions.Admin/preview/2015-11-01/DirectoryTenant.json
    - Microsoft.Subscriptions.Admin/preview/2015-11-01/Location.json
    - Microsoft.Subscriptions.Admin/preview/2015-11-01/Offer.json
    - Microsoft.Subscriptions.Admin/preview/2015-11-01/OfferDelegation.json
    - Microsoft.Subscriptions.Admin/preview/2015-11-01/Plan.json
    - Microsoft.Subscriptions.Admin/preview/2015-11-01/Quota.json
\`\`\`

`)
    );

    const testSuppression = {
      suppress: "AsLky90MubsiXGRHGjAMKzEtTuuKUDCUhHPQNTk",
      from: "lUmVYo1ZAowYnYUdSOmf8",
      where: "hZV5fcZfA7xDP1ReGU4pEKLWfvd08",
      reason: "asdfasdFAsdf"
    };

    addSuppression(asdf.markDown, testSuppression);
    const asa = await cm2md.markDownExToString(asdf);
    chai.expect(asa).to.include(testSuppression.suppress);
    chai.expect(asa).to.include(testSuppression.reason);
    chai.expect(asa).to.include(testSuppression.where[0]);
    chai.expect(asa).to.include(testSuppression.where[1]);
  });
});
