// Accountability Chart Tools
// Tools for working with organizational structure, seats, roles, and reporting relationships

import { callSuccessCoGraphQL } from "./core.js";

/**
 * Get the accountability chart (organizational structure) for the company
 * This tool fetches the complete organizational hierarchy including all users,
 * their roles, teams, and reporting relationships to answer questions like
 * "Who reports to the Integrator?" or "What is the organizational structure?"
 *
 * @param {Object} params - Parameters for the accountability chart query
 * @param {string} params.stateId - State filter (defaults to 'ACTIVE')
 * @param {string} params.teamId - Optional team filter to focus on specific team
 * @returns {Promise<Object>} The accountability chart data
 */
export async function getAccountabilityChart({
  stateId = "ACTIVE",
  teamId,
} = {}) {
  try {
    // First, get the primary org chart
    const orgChartsQuery = `
      query {
        orgCharts(filter: {stateId: {equalTo: "${stateId}"}, isPrimaryChart: {equalTo: 1}}) {
          nodes {
            id
            name
            description
            isPrimaryChart
            userId
            companyId
            createdAt
            updatedAt
          }
          totalCount
        }
      }
    `;

    // Execute the org charts query
    const orgChartsResult = await callSuccessCoGraphQL(orgChartsQuery);

    // Check for errors
    if (!orgChartsResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching org charts: ${orgChartsResult.error}`,
          },
        ],
      };
    }

    const orgCharts = orgChartsResult.data.data.orgCharts.nodes;

    if (orgCharts.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No primary org chart found. Please ensure there is an org chart marked as primary (isPrimaryChart = 1).",
          },
        ],
      };
    }

    const primaryOrgChart = orgCharts[0]; // Get the first (and should be only) primary chart

    // Now get the org chart seats for this primary chart
    const orgChartSeatsQuery = `
      query {
        orgChartSeats(filter: {orgChartId: {equalTo: "${primaryOrgChart.id}"}, stateId: {equalTo: "${stateId}"}}) {
          nodes {
            id
            name
            parentId
            order
            holders
            orgChartId
            createdAt
            updatedAt
          }
          totalCount
        }
      }
    `;

    // Execute the org chart seats query
    const orgChartSeatsResult = await callSuccessCoGraphQL(orgChartSeatsQuery);

    // Check for errors
    if (!orgChartSeatsResult.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching org chart seats: ${orgChartSeatsResult.error}`,
          },
        ],
      };
    }

    const orgChartSeats = orgChartSeatsResult.data.data.orgChartSeats.nodes;

    // Get roles and responsibilities for each seat
    const seatIds = orgChartSeats.map((seat) => seat.id);
    const rolesMap = {};

    if (seatIds.length > 0) {
      // Query roles and responsibilities in batches
      const batchSize = 50;
      for (let i = 0; i < seatIds.length; i += batchSize) {
        const batch = seatIds.slice(i, i + batchSize);
        const seatIdsStr = batch.map((id) => `"${id}"`).join(", ");

        const rolesQuery = `
          query {
            orgChartRolesResponsibilities(filter: {orgChartSeatId: {in: [${seatIdsStr}]}, stateId: {equalTo: "ACTIVE"}}) {
              nodes {
                id
                orgChartSeatId
                name
                description
                order
                createdAt
                updatedAt
              }
            }
          }
        `;

        const rolesResult = await callSuccessCoGraphQL(rolesQuery);
        if (
          rolesResult.ok &&
          rolesResult.data.data.orgChartRolesResponsibilities.nodes
        ) {
          rolesResult.data.data.orgChartRolesResponsibilities.nodes.forEach(
            (role) => {
              if (!rolesMap[role.orgChartSeatId]) {
                rolesMap[role.orgChartSeatId] = [];
              }
              rolesMap[role.orgChartSeatId].push(role);
            }
          );
        }
      }
    }

    // Deduplicate roles and responsibilities by name and description
    Object.keys(rolesMap).forEach((seatId) => {
      const roles = rolesMap[seatId];
      const uniqueRoles = [];
      const seen = new Set();

      roles.forEach((role) => {
        // Create a key based on name and description to identify duplicates
        const key = `${role.name}:${role.description || ""}`;
        const cleanName = role.name ? role.name.trim() : "";

        // Filter out invalid entries: empty names, single characters, or very short names
        const isValidRole =
          cleanName &&
          cleanName.length > 1 &&
          !/^[A-Z]$/.test(cleanName) && // Single letters
          !/^\d+$/.test(cleanName) && // Just numbers
          cleanName.length > 2; // At least 3 characters

        if (!seen.has(key) && isValidRole) {
          seen.add(key);
          uniqueRoles.push(role);
        }
      });

      rolesMap[seatId] = uniqueRoles;
    });

    // Get all unique user IDs from seat holders
    const allHolderIds = new Set();
    orgChartSeats.forEach((seat) => {
      if (seat.holders) {
        // Split by comma and clean up whitespace
        const holderIds = seat.holders
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id);
        holderIds.forEach((id) => allHolderIds.add(id));
      }
    });

    // Get user information for all holders
    const usersMap = {};
    if (allHolderIds.size > 0) {
      const userIds = Array.from(allHolderIds);

      // Query users in batches to avoid very long queries
      const batchSize = 50;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const userIdsStr = batch.map((id) => `"${id}"`).join(", ");

        const usersQuery = `
          query {
            users(filter: {id: {in: [${userIdsStr}]}}) {
              nodes {
                id
                firstName
                lastName
                email
                jobTitle
              }
            }
          }
        `;

        const usersResult = await callSuccessCoGraphQL(usersQuery);
        if (usersResult.ok && usersResult.data.data.users.nodes) {
          usersResult.data.data.users.nodes.forEach((user) => {
            usersMap[user.id] = user;
          });
        }
      }
    }

    let accountabilityChart = `# Accountability Chart\n\n`;
    accountabilityChart += `**Chart:** ${primaryOrgChart.name}\n`;
    if (primaryOrgChart.description) {
      accountabilityChart += `**Description:** ${primaryOrgChart.description}\n`;
    }
    accountabilityChart += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

    if (orgChartSeats.length === 0) {
      accountabilityChart += `No seats found in the primary org chart.\n`;
      return {
        content: [
          {
            type: "text",
            text: accountabilityChart,
          },
        ],
      };
    }
    // Build the organizational hierarchy
    const seatsById = {};
    const rootSeats = [];

    // First pass: create seat objects and find root seats
    orgChartSeats.forEach((seat) => {
      seatsById[seat.id] = {
        ...seat,
        children: [],
        level: 0, // Will be calculated
      };

      // Find root seats (those with no parent or parent not in our data)
      if (!seat.parentId || !seatsById[seat.parentId]) {
        rootSeats.push(seat.id);
      }
    });

    // Second pass: build parent-child relationships and calculate levels
    const calculateLevel = (seatId, level = 0) => {
      const seat = seatsById[seatId];
      if (!seat) return;

      seat.level = level;

      // Find children
      Object.values(seatsById).forEach((otherSeat) => {
        if (otherSeat.parentId === seatId) {
          seat.children.push(otherSeat.id);
          calculateLevel(otherSeat.id, level + 1);
        }
      });
    };

    // Calculate levels starting from root seats
    rootSeats.forEach((rootSeatId) => {
      calculateLevel(rootSeatId, 0);
    });

    // Sort seats by level and then by order
    const sortedSeats = Object.values(seatsById).sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      return a.order - b.order;
    });

    // Display the organizational structure
    accountabilityChart += `## Organizational Structure\n\n`;

    sortedSeats.forEach((seat) => {
      const indent = "  ".repeat(seat.level);
      accountabilityChart += `${indent}### ${seat.name}\n`;

      if (seat.holders) {
        // Split holders by comma and look up names
        const holderIds = seat.holders
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id);
        const holderNames = [];

        holderIds.forEach((holderId) => {
          const user = usersMap[holderId];
          if (user) {
            holderNames.push(
              `${user.firstName} ${user.lastName} (ID: ${user.id})`
            );
          } else {
            holderNames.push(`Unknown User (ID: ${holderId})`);
          }
        });

        if (holderNames.length > 0) {
          accountabilityChart += `${indent}**Seat Holders:**\n`;
          holderNames.forEach((name) => {
            accountabilityChart += `${indent}  • ${name}\n`;
          });
        } else {
          accountabilityChart += `${indent}**Seat Holders:** *Vacant*\n`;
        }
      } else {
        accountabilityChart += `${indent}**Seat Holders:** *Vacant*\n`;
      }

      // Add role responsibilities if any
      const seatRoles = rolesMap[seat.id] || [];
      if (seatRoles.length > 0) {
        accountabilityChart += `${indent}**Roles & Responsibilities:**\n`;
        seatRoles
          .sort((a, b) => a.order - b.order)
          .forEach((responsibility) => {
            // Clean up the name and description
            const cleanName = responsibility.name
              ? responsibility.name.trim()
              : "";
            const cleanDescription = responsibility.description
              ? responsibility.description.trim()
              : "";

            if (cleanName) {
              accountabilityChart += `${indent}  • ${cleanName}`;
              if (cleanDescription && cleanDescription.length > 0) {
                accountabilityChart += `: ${cleanDescription}`;
              }
              accountabilityChart += `\n`;
            }
          });
      }

      accountabilityChart += `\n`;
    });

    // Add summary information
    accountabilityChart += `## Summary\n\n`;
    accountabilityChart += `- **Total Seats:** ${orgChartSeats.length}\n`;
    accountabilityChart += `- **Filled Seats:** ${
      orgChartSeats.filter((seat) => seat.holders && seat.holders.trim()).length
    }\n`;
    accountabilityChart += `- **Vacant Seats:** ${
      orgChartSeats.filter((seat) => !seat.holders || !seat.holders.trim())
        .length
    }\n`;

    // Count total roles and responsibilities
    const totalRoles = Object.values(rolesMap).reduce((total, roles) => {
      return total + roles.length;
    }, 0);
    accountabilityChart += `- **Total Roles & Responsibilities:** ${totalRoles}\n`;
    accountabilityChart += `- **Chart ID:** ${primaryOrgChart.id}\n`;

    return {
      content: [
        {
          type: "text",
          text: accountabilityChart,
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching accountability chart:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error fetching accountability chart: ${error.message}`,
        },
      ],
    };
  }
}
