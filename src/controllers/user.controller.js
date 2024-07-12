import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/Cloudinary.js"
import {ApiResponce} from "../utils/ApiResponce.js"

const registerUser = asyncHandler(async (req,res) => {
    // get user detail from frontent 
    // validation - non empty 
    // check if user is already exists : username,email
    // check for images , check for avtar
    // upload them to cloudinary , avatar 
    // create user object - create entry in db
    // remove password and refersh token field from response
    // check for user creation 
    // return  response

    const { fullName ,email ,username ,password} = req.body
    console.log("email",email);

    if( 
        [fullName,email,username,password].some((field) => field ?.trim() === "")
    ){
        throw new ApiError(400,"all fields are required")
    }

    const existedUser = User.findOne({
        $or: [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponce(200,createdUser,"User registered successfully")
    )

})

export {registerUser}