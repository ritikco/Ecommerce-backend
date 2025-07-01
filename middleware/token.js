const jwt = require('jsonwebtoken');


exports.userToken = jwt.sign(
  { id: user._id, role: 'user' },
  process.env.JWT_SECRET,
  { expiresIn: '90d' }
);


exports.adminToken = jwt.sign(
  { id: admin._id, role: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '90d' }
);
