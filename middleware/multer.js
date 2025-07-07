const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ Upload directory inside public/image
const uploadDir = path.join(__dirname, '..', 'public', 'image');

// ✅ Create /public/image directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // recursive ensures parent folders are created
}

// ✅ Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

// ✅ Multer file filter
const imageFileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpg, .jpeg, .png, and .webp formats are allowed'), false);
  }
};

// ✅ Multer storage config
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

// ✅ Multer upload instance
const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // Max 2MB
  }
});

const anyFilesUpload = upload.any();

// ✅ Export middlewares
module.exports = {
  parseFormData: upload.none(),
  singleImageUpload: upload.single('image'),
  multipleImagesUpload: upload.array('images', 10),
  anyFilesUpload
};
