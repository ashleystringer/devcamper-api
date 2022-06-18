const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const geocoder = require('../utils/geocoder');
const Bootcamp = require('../models/Bootcamp');

//Desc: Get all bootcamps
//Route: GET /api/v1/bootcamps
//Access: Public  
exports.getBootcamps = asyncHandler(async (req, res, next) => {

        res.status(200).json(res.advancedResults);
});

//Desc: Get single bootcamp
//Route: GET /api/v1/bootcamps/:id
//Access: Public  
exports.getBootcamp = asyncHandler(async (req, res, next) => {
        const bootcamp = await Bootcamp.findById(req.params.id);

        if(!bootcamp){
            return next(new ErrorResponse(`Bootcamp not found with ID of ${req.params.id}`, 404));
        }
        res.status(200).json({success: true, data: bootcamp});
    //res.status(200).json({success: true, msg:`Get bootcamp ${req.params.id}`});
})

//Desc: Create new bootcamp
//Route: POST /api/v1/bootcamps
//Access: Private  
exports.createBootcamp = asyncHandler(async (req, res, next) => {
    // Add user to req.body
        req.body.user = req.user.id;

        // Check for published bootcamp
        const publishedBootcamp = await Bootcamp.findOne({ user: req.user.id });

        // If the user is not an admin, they canonly add one bootcamp
        if(publishedBootcamp && req.user.role !== 'admin'){
            return next(new ErrorResponse(`The user with ID ${req.user.id}
            has already published a bootcamp`, 400));
        }

        const bootcamp = await Bootcamp.create(req.body);
    
        res.status(201).json({
            success: true,
            data: bootcamp
        });

    /*console.log(req.body);
    res.status(200).json({success: true, msg:'Create new bootcamp'});*/
})

//Desc: Update bootcamp
//Route: PUT /api/v1/bootcamps/:id
//Access: Private  
exports.updateBootcamp = asyncHandler(async (req, res, next) => {
        let bootcamp = await Bootcamp.findById(req.params.id);
        if(!bootcamp){
            return next(new ErrorResponse(`Bootcamp not found with ID of ${req.params.id}`, 404));
        }

        // Make sure user is bootcamp owner
        if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin'){
            return next(new ErrorResponse(`User ${req.params.id} is not authorized 
            to update this bootcamp`, 404));
        }

    bootcamp = await Bootcamp.findOneAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({ success: true, data: bootcamp});
    //res.status(200).json({success: true, msg:`Update bootcamp ${req.params.id}`});
})

//Desc: Delete bootcamp
//Route: DELETE /api/v1/bootcamps/:id
//Access: Private  
exports.deleteBootcamp = asyncHandler(async (req, res, next) => { 
        const bootcamp = await Bootcamp.findById(req.params.id, req.body);
        if(!bootcamp){
            return next(new ErrorResponse(`Bootcamp not found with ID of ${req.params.id}`, 404));
        }

        // Make sure user is bootcamp owner
        if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin'){
            return next(new ErrorResponse(`User ${req.params.id} is not authorized 
            to delete this bootcamp`, 401));
        }

        bootcamp.remove();

        res.status(200).json({ success: true, data: {}});

    //res.status(200).json({success: true, msg:`Delete bootcamp ${req.params.id}`});
});

//Desc: Get bootcamps within a radius
//Route: GET /api/v1/bootcamps/radius/:zipcode/:distance
//Access: Private  
exports.getBootcampsInRadius = asyncHandler(async (req, res, next) => { 

    const { zipcode, distance } = req.params;

    console.log(`zipcode: ${zipcode}  distance: ${distance}`);

    // Get lat/lng from geocoder
    const loc = await geocoder.geocode(zipcode);
    const lat = loc[0].latitude;
    const lng = loc[0].longitude;

    // Calc radius using radians
    // Divide distance by radius of Earth
    // Earth Radius = 3963 mi / 6,378 km
    const radius = distance / 3963;

    const bootcamps = await Bootcamp.find({
        location: {$geoWithin: { $centerSphere: [[lng, lat], radius]}}
    });

    res.status(200).json({
        success: true,
        count: bootcamps.length,
        data: bootcamps
    });
});

//Desc: Upload photo for bootcamp
//Route: PUT /api/v1/bootcamps/:id/photo
//Access: Private  
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next) => { 
    const bootcamp = await Bootcamp.findById(req.params.id, req.body);
    if(!bootcamp){
        return next(new ErrorResponse(`Bootcamp not found with ID of ${req.params.id}`, 404));
    }

    // Make sure user is bootcamp owner
    if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin'){
        return next(new ErrorResponse(`User ${req.params.id} is not authorized 
        to update this bootcamp`, 401));
    }

    if(!req.files){
        return next(new ErrorResponse(`Please upload a file`, 400));
    }

    const file = req.files.file;

    // Make sure the image is a photo
    if(!file.mimetype.startsWith('image')){
        return next(new ErrorResponse(`Please upload an image file`, 400));
    }

    // Check filesize
    if(file.size > process.env.MAX_FILE_UPLOAD){
        return next(new ErrorResponse(`Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`, 400));
    }

    // Create custom filename
    file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;
    
    file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err=>{
        if(err){
            console.error(err);
            return next(new ErrorResponse(`Problem with file upload`, 500));
        }

        await Bootcamp.findByIdAndUpdate(req.params.id, {photo: file.name });

        res.status(200).json({
            success: true,
            data: file.name
        });
    });
    
});