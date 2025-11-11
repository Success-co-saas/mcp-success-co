// Issues Tools (REFACTORED)
// Tools for creating, reading, and updating issues
// This is a refactored version showing the improvements with helper functions

import { callSuccessCoGraphQL } from "./core.js";
import { validateStateId as validateStateIdOld } from "../utils/helpers.js";
import {
  mapPriorityToNumber,
  mapPriorityToText,
  mapIssueTypeToLowercase,
} from "../utils/helpers.js";
import {
  requireApiKey,
  requireField,
  resolveTeamId,
  requireContext,
  resolveUserId,
  buildFilterString,
  buildPaginationString,
  executeGraphQL,
  executeMutation,
  requireUpdates,
  createListResponse,
  createSuccessResponse,
  createMutationVariables,
  createUpdateVariables,
  handleCRUDOperation,
  validateStateId,
} from "./commonHelpers.js";

/**
 * List Success.co issues (REFACTORED VERSION)
 * @param {Object} args - Arguments object
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function getIssues(args) {
  return handleCRUDOperation(async () => {
    const {
      first,
      offset,
      stateId = "ACTIVE",
      teamId: providedTeamId,
      leadershipTeam = false,
      userId,
      status = "TODO",
      type = "Short-term",
      fromMeetings = false,
      keyword,
      createdAfter,
      createdBefore,
      statusUpdatedBefore,
    } = args;

    // Validate state ID
    validateStateId(stateId);

    // Resolve team ID
    const teamId = await resolveTeamId(providedTeamId, leadershipTeam);

    // Validate status
    if (status && !["TODO", "COMPLETE", "ALL"].includes(status)) {
      throw new Error('Invalid status - must be "TODO", "COMPLETE", or "ALL"');
    }

    // Validate type
    if (type && !["Short-term", "Long-term", "ALL"].includes(type)) {
      throw new Error(
        'Invalid type - must be "Short-term", "Long-term", or "ALL"'
      );
    }

    // Build filter
    const filters = {
      stateId: { equalTo: stateId },
    };

    if (teamId) filters.teamId = { equalTo: teamId };
    if (userId) filters.userId = { equalTo: userId };
    if (keyword) filters.name = { includesInsensitive: keyword };
    if (status && status !== "ALL") filters.issueStatusId = { equalTo: status };
    if (type && type !== "ALL") filters.type = { equalTo: type.toLowerCase() };
    if (fromMeetings) filters.meetingId = { isNull: false };
    if (createdAfter)
      filters.createdAt = { greaterThanOrEqualTo: createdAfter };
    if (createdBefore)
      filters.createdAt = {
        ...filters.createdAt,
        lessThanOrEqualTo: createdBefore,
      };
    if (statusUpdatedBefore)
      filters.statusUpdatedAt = { lessThanOrEqualTo: statusUpdatedBefore };

    const filterStr = buildFilterString(filters);
    const paginationStr = buildPaginationString(first, offset);

    const query = `
      query {
        issues(${filterStr ? `filter: {${filterStr}}` : ""}${
      paginationStr ? `, ${paginationStr}` : ""
    }) {
          nodes {
            id
            issueStatusId
            name
            desc
            teamId
            userId
            type
            priorityNo
            priorityOrder
            statusUpdatedAt
            meetingId
            createdAt
            stateId
            companyId
          }
          totalCount
        }
      }
    `;

    const data = await executeGraphQL(query);

    return createListResponse(
      data.data.issues.nodes.map((issue) => ({
        id: issue.id,
        name: issue.name,
        description: issue.desc || "",
        status: issue.issueStatusId,
        type: issue.type
          ? issue.type.charAt(0).toUpperCase() + issue.type.slice(1)
          : null,
        priority: mapPriorityToText(issue.priorityNo),
        priorityOrder: issue.priorityOrder,
        teamId: issue.teamId,
        userId: issue.userId,
        meetingId: issue.meetingId,
        createdAt: issue.createdAt,
        statusUpdatedAt: issue.statusUpdatedAt,
      })),
      data.data.issues.totalCount
    );
  });
}

/**
 * Create a new issue (REFACTORED VERSION)
 * @param {Object} args - Arguments object
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function createIssue(args) {
  return handleCRUDOperation(async () => {
    const {
      name,
      teamId: providedTeamId,
      leadershipTeam = false,
      desc = "",
      userId: providedUserId,
      priority = "Medium",
      type: providedType = "Short-term",
    } = args;

    // Validate required fields
    requireField(name, "Issue name");

    // Resolve team ID (required)
    const teamId = await resolveTeamId(providedTeamId, leadershipTeam, true);

    // Get API key and context
    const apiKey = requireApiKey();
    const context = await requireContext(apiKey);

    // Prepare issue data
    const issueData = {
      name,
      desc,
      issueStatusId: "TODO",
      priorityNo: mapPriorityToNumber(priority),
      type: mapIssueTypeToLowercase(providedType),
      teamId,
      userId: resolveUserId(context, providedUserId),
      companyId: context.companyId,
      stateId: "ACTIVE",
    };

    const mutation = `
      mutation CreateIssue($input: CreateIssueInput!) {
        createIssue(input: $input) {
          issue {
            id
            name
            desc
            issueStatusId
            teamId
            userId
            type
            priorityNo
            createdAt
            stateId
            companyId
          }
        }
      }
    `;

    const issue = await executeMutation(
      mutation,
      createMutationVariables(issueData, "issue"),
      "createIssue.issue"
    );

    return createSuccessResponse({ issue }, "Issue created successfully");
  });
}

/**
 * Update an existing issue (REFACTORED VERSION)
 * @param {Object} args - Arguments object
 * @returns {Promise<{content: Array<{type: string, text: string}>}>}
 */
export async function updateIssue(args) {
  return handleCRUDOperation(async () => {
    const {
      issueId,
      name,
      desc,
      issueStatusId,
      teamId: providedTeamId,
      leadershipTeam = false,
      userId,
      priority,
    } = args;

    // Validate required fields
    requireField(issueId, "Issue ID");

    // Require API key
    requireApiKey();

    // Resolve team ID if provided
    const teamId = await resolveTeamId(providedTeamId, leadershipTeam);

    // Build updates object
    const updates = {};
    if (name) updates.name = name;
    if (desc !== undefined) updates.desc = desc;
    if (issueStatusId) updates.issueStatusId = issueStatusId;
    if (teamId) updates.teamId = teamId;
    if (userId) updates.userId = userId;
    if (priority !== undefined)
      updates.priorityNo = mapPriorityToNumber(priority);

    // Validate at least one update
    requireUpdates(updates);

    const mutation = `
      mutation UpdateIssue($input: UpdateIssueInput!) {
        updateIssue(input: $input) {
          issue {
            id
            name
            desc
            issueStatusId
            teamId
            userId
            priorityNo
            statusUpdatedAt
            stateId
          }
        }
      }
    `;

    const issue = await executeMutation(
      mutation,
      createUpdateVariables(issueId, updates),
      "updateIssue.issue"
    );

    return createSuccessResponse({ issue }, "Issue updated successfully");
  });
}
