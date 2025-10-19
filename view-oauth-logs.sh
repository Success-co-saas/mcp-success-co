#!/bin/bash
# Helper script to view OAuth logs from both services

echo "========================================="
echo "MCP Server Log (/tmp/mcp-server.log)"
echo "========================================="
if [ -f /tmp/mcp-server.log ]; then
  cat /tmp/mcp-server.log
else
  echo "Log file not found. MCP server may not be running."
fi

echo ""
echo "========================================="
echo "ServiceAPI Log (/tmp/serviceapi.log)"
echo "========================================="
if [ -f /tmp/serviceapi.log ]; then
  cat /tmp/serviceapi.log
else
  echo "Log file not found. ServiceAPI may not be running."
fi

echo ""
echo "========================================="
echo "To view logs in real-time, run:"
echo "  tail -f /tmp/mcp-server.log"
echo "  tail -f /tmp/serviceapi.log"
echo "========================================="

