import { Router } from 'express';
import mcpController from './server';

const router = Router();

/**
 * MCP Server Endpoints
 * These endpoints provide the Model Context Protocol interface for AI agents
 */

/**
 * Get MCP server capabilities
 * GET /mcp
 */
router.get('/', async (req, res) => {
  await mcpController.getMCPCapabilities(req, res);
});

/**
 * Get article as MCP resource
 * GET /mcp/resource/article/:articleId
 */
router.get('/resource/article/:articleId', async (req, res) => {
  await mcpController.getArticleResource(req, res);
});

/**
 * Get articles collection as MCP resource
 * GET /mcp/resource/articles
 */
router.get('/resource/articles', async (req, res) => {
  await mcpController.searchArticlesResource(req, res);
});

/**
 * Get platform statistics as MCP resource
 * GET /mcp/resource/stats
 */
router.get('/resource/stats', async (req, res) => {
  await mcpController.getStatsResource(req, res);
});

/**
 * Get sources information as MCP resource
 * GET /mcp/resource/sources
 */
router.get('/resource/sources', async (req, res) => {
  await mcpController.getSourcesResource(req, res);
});

/**
 * Verify article using MCP tool
 * POST /mcp/tool/verifyArticle
 */
router.post('/tool/verifyArticle', async (req, res) => {
  await mcpController.verifyArticleTool(req, res);
});

/**
 * Search articles using MCP tool
 * POST /mcp/tool/searchArticles
 */
router.post('/tool/searchArticles', async (req, res) => {
  await mcpController.searchArticlesTool(req, res);
});

/**
 * Get trending topics using MCP tool
 * POST /mcp/tool/getTrendingTopics
 */
router.post('/tool/getTrendingTopics', async (req, res) => {
  await mcpController.getTrendingTopicsTool(req, res);
});

/**
 * Get geographic distribution using MCP tool
 * POST /mcp/tool/getGeographicDistribution
 */
router.post('/tool/getGeographicDistribution', async (req, res) => {
  await mcpController.getGeographicDistributionTool(req, res);
});

/**
 * Analyze sentiment using MCP tool
 * POST /mcp/tool/analyzeSentiment
 */
router.post('/tool/analyzeSentiment', async (req, res) => {
  await mcpController.analyzeSentimentTool(req, res);
});

/**
 * Cluster topics using MCP tool
 * POST /mcp/tool/clusterTopics
 */
router.post('/tool/clusterTopics', async (req, res) => {
  await mcpController.clusterTopicsTool(req, res);
});

export default router;