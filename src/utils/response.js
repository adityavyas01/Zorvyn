export const successResponse = (res, data, message) => {
  return res.json({
    success: true,
    data,
    message,
  });
};

export const errorResponse = (res, message, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
  });
};
