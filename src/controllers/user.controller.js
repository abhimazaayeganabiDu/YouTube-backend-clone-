import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"



const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens")
    }
}




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
        email,
        password,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
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
        new ApiResponse(200, createdUser, "User registered Successfully")
    )


})



const loginUser = asyncHandler(async (req, res) => {

    // get user detail from frontent ->req.body username or email
    const { email, username, password } = req.body


    // validation - non empty
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required")
    }

    // check if user exists
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exists")
    }

    // check if password is correct

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(402, "Please enter correct password")
    }

    // generate access token and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    // send cookie
    const loggedInUser = await User.findById(user._id).select("-pawword -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    // return  response
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )
})



const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined
        }
    },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {}, "User logged out sucessfull"))

})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh Token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used ")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user_id)

        return res
            .status(200)
            .cookie("accessToken",)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200, { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )

    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }

})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}