export function errorHandler(err, req, res, next) {
  console.error('🔥 ERROR:', err)

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value',
    })
  }

  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  })
}
