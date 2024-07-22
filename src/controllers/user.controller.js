import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
    // get user detail from frontent 
    // validation - non empty 
    // check if user is already exists : username,email
    // check for images , check for avtar
    // upload them to cloudinary , avatar 
    // create user object - create entry in db
    // remove password and refersh token field from response
    // check for user creation 
    // return  response
    
    
    
    // *1* get user detail from frontent 
    const { fullName, email, username, password } = req.body
    
    
    // *2* validation - non empty 
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }
    
    
    // *3* check if user is already exists : username,email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //console.log(req.files);
    
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    
    // *4* check for images , check for avtar
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    
    // *5* upload them to cloudinary , avatar 
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
    
    // *6* create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    
    // *7* remove password and refersh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    // *8* check for user creation  
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    
    // *9* return  response
    return res.status(201).json(
        new ApiResponse (200, createdUser, "User registered Successfully")
    )
    

})

export { registerUser }