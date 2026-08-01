const { sendError } = require('../utils/response');

function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'Request body contains invalid JSON');
  }

  if (err.code === '23505') {
    return sendError(res, 409, 'A record with this unique value already exists');
  }

  if (err.code === '23503') {
    return sendError(res, 409, 'This action is blocked by an existing relationship');
  }

  if (err.code === '23514') {
    return sendError(res, 400, 'A value failed a database validation rule');
  }

  if (err.code === '23502') {
    return sendError(res, 400, 'A required field is missing');
  }

  if (err.code === '22P02') {
    return sendError(res, 400, 'Invalid input format');
  }

  if (err.status === 400) {
    return sendError(res, 400, 'Invalid request');
  }

  return sendError(res, 500, 'Internal server error');
}

module.exports = errorHandler;