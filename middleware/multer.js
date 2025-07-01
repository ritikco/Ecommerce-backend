const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create /uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

// Multer file filter function
const imageFileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpg, .jpeg, .png, and .webp formats are allowed'), false);
  }
};

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${file.fieldname}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

// Create the multer instance
const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // Max file size: 2MB
  }
});

// Export reusable middlewares
module.exports = {
  parseFormData: upload.none(),
  singleImageUpload: upload.single('profileImage'),
  multipleImagesUpload: upload.array('images', 5)
};
