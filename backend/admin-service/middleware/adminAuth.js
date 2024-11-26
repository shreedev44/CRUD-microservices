import User from '../model/model.js'
import jwt from 'jsonwebtoken'

const verifyUser = async (req, res, next) => {
    try{
        let userPayload = req.headers['x-user-payload']
        req.user = JSON.parse(userPayload)
        const userExist = await User.findById(req.user?.userId)

        if(userExist) {
            next()
        } else {
            res.status(404).json({message: "User not found"})
        }

    } catch(err) {
        console.log(err)
        res.status(403).json({message: "Invalid or expired token"})
    }
}

export default verifyUser


export const refreshToken = async (req, res) => {
    try{
        const refreshToken = req.cookies.refreshToken;

        if(!refreshToken) {
            return res.status(403).json({message: "No refresh token provided"})
        }

        jwt.verify(
            refreshToken,
            process.env.JWT_REF_SECRET,
            async (err, decoded) => {
                if(err) {
                    return res.status(403).json({message: "Invalid or expired refresh token"})
                }

                const user = await User.findById(decoded.userId)

                if(!user) {
                    return res.status(404).json({message: "User not found"})
                }

                let payload = {
                    userName: user.name,
                    userId: user._id,
                    role: "admin",
                    iat: Date.now()
                }

                const accessToken = jwt.sign(
                    payload,
                    process.env.JWT_ACC_SECRET,
                    { expiresIn: "1h" }
                );

                res.status(200).json({ accessToken})
            }
        )
    } catch(err) {
        console.log(err)
        res.status(500).json({message: "Error while refreshing token"})
    }
}