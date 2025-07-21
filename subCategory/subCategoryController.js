const Admin = require('../admin/adminModel');
const Subcategory = require('./subCategoryModel');

exports.addSubCategory = async (req , res) =>{
    try {
        const adminId = req.token._id;
        const admin = await Admin.findById(adminId);

        if(!admin){
            return res.send({
                statusCode : 200,
                success : true,
                message : "Unauthorised access",
                result : {}
            })
        }

        const {name , category } = req.body;
        const imagePath = `${req.file.filename}`;

        const subCategory = new Subcategory({
         name : name,
         image : imagePath,
         status : "active",
         category : category
        });

        await subCategory.save();

        return res.send({
            statusCode : 200,
            success : true,
            message : "subCategory created Successfully",
            result : {}
        })

    } catch (error) {

        return res.send({
            statusCode : 500,
            success : false,
            message : "Internal server error",
            result : error.message
        })
        
    }
}