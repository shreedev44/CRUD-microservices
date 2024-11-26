import { sendInsertToAdmin, sendUpdateToAdmin } from "../utils/rabbitmq.js"
import User from '../model/model.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'


const nameRegex = /^[a-zA-Z]{3,}(?: [a-zA-Z]{3,})*$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minLengthRegex = /^.{8,}$/;

const securePassword = async (password) => {
    try{
        const hashedPassword = await bcrypt.hash(password, 10)
        return hashedPassword
    } catch(err) {
        console.log(err)
        throw err
    }
}

const register = async (req, res) => {
    try{
        const {name, email, password} = req.body;

        if(!nameRegex.test(name)) {
            return res.status(400).json({ message: "Please enter a valid name (A - Z)" })
        }

        if(!emailRegex.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email" })
        }

        if(!minLengthRegex.test(password)) {
            return res.status(400).json({ message: "The password should contain atleast 8 characters" })
        }

        let userExist = await User.findOne({email: email});
        if(userExist) {
            return res.status(409).json({ message: "User already exist" })
        }

        const hashedPassword = await securePassword(password)

        const user = new User({
            name,
            email,
            password: hashedPassword
        })

        const userData = await user.save()
        sendInsertToAdmin(userData)

        if(userData) {
            res.status(201).json({ message: "Sign up successful", name: userData.name })
        } else {
            throw Error("Something went wrong while creating user")
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: "Error while registration" })
    }
}


const verifyUser = async (req, res) => {
    try{
        const {email, password} = req.body;

        let userExist = await User.findOne({email: email})

        if(!userExist) {
            return res.status(404).json({message: "User not found"})
        }

        const passwordCorrect = await bcrypt.compare(password, userExist.password)

        if(passwordCorrect) {
            let payload = {
                userName: userExist.name,
                userId: userExist._id,
                role: "user",
                iat: Date.now()
            }

            const accessToken = jwt.sign(
                payload,
                process.env.JWT_ACC_SECRET,
                { expiresIn: "1h" }
            );

            const refreshToken = jwt.sign(
                payload,
                process.env.JWT_REF_SECRET,
                { expiresIn: "7d" }
            )

            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            })

            res.status(200).json({
                jwtToken: accessToken,
                userData: userExist,
            });
        } else {
            res.status(400).json({message: "Incorrect Password"});
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({message: "Error while logging in"})
    }
}


const fetchUser = async (req, res) => {
    try{
        const userData = await User.findById(req.user?.userId)
        res.status(200).json({userData})
    } catch(err) {
        console.log(err)
        res.status(500).json({message: "Error while fetching user"})
    }
}


const updateProfile = async (req, res) => {
    try{
        const {name, email} = req.body
        if(name && !nameRegex.test(name)) {
            return res.status(400).json({message: "Please enter a valid name (A - Z)"})
        }

        if(email && !emailRegex.test(email)) {
            return res.status(400).json({message: "Please enter a valid email"})
        }

        if(email) {
            const userExist = await User.findOne({email})
            if(userExist && userExist._id != req.user?.userId) {
                return res.status(409).json({message: "User already exist with this email"})
            }
        }

        await User.findByIdAndUpdate(req.user?.userId, req.body);
        sendUpdateToAdmin({userId: req.user?.userId, body: req.body})
        res.status(200).json({message: "Profile updated successfully"})
    } catch (err) {
      console.log(err)
      res.status(500).json({message: "Error while updating user"})
    }
}


const logout = async (req, res) => {
    try{
        res.clearCookie('refreshToken')
        res.status(200).json({message: "Logout successful"})
    } catch (err) {
        console.log(err)
        res.status(500).json({message: "Error while logging out"})
    }
}

export default {
    register,
    verifyUser,
    fetchUser,
    updateProfile,
    logout
}