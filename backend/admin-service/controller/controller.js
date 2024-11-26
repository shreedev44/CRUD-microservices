import User from '../model/model.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sendInsertToUser, sendDeleteToUser, sendUpdateToUser } from '../utils/rabbitmq.js';
import { notifyUser } from '../utils/grpc.js';


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


const verifyAdmin = async (req, res) => {
    try{
        const {email, password} = req.body

        const adminExist = await User.findOne({email, role: 'admin'})

        if(!adminExist) {
            return res.status(404).json({message: "Admin not found"});
        }

        const passwordCorrect = await bcrypt.compare(password, adminExist.password)

        if(!passwordCorrect) {
            return res.status(400).json({message: "Incorrect Password"})
        }

        let payload = {
            userName: adminExist.name,
            userId: adminExist._id,
            role: "admin",
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
            adminData: adminExist,
        });
    } catch(err) {
        console.log(err)
        res.status(500).json({message: "Error while logging in"})
    }
}


const fetchAdmin = async (req, res) => {
    try{
        const adminData = await User.findById(req.user?.userId)
        res.status(200).json({adminData})
    } catch(err) {
        console.log(err)
        res.status(500).json({message: "Error while fetching admin"})
    }
}


const fetchUsers = async (req, res) => {
    try{
        const users = await User.find({role: 'user'})
        res.status(200).json({users})
    } catch (err) {
        console.log(err)
        res.status(500).json({message: "Error while fetching users"})
    }
}


const addUser = async (req, res) => {
    try{
        const { name, email, password } = req.body;

        if(!nameRegex.test(name)) {
            return res.status(400).json({message: "Please enter a valid name (A - Z)"})
        }

        if(!emailRegex.test(email)) {
            return res.status(400).json({message: "Please enter a valid email"})
        }

        if(!minLengthRegex.test(password)) {
            return res.status(400).json({message: "The password must contain atleast 8 characters"})
        }

        const userExist = await User.findOne({email})
        if(userExist) {
            res.status(409).json({message: "User already exist"})
        }


        const hashedPassword = await securePassword(password)

        const user = new User({
            name,
            email,
            password: hashedPassword
        })

        const userData = await user.save()
        sendInsertToUser(userData)


        if(userData) {
            res.status(201).json({ message: "User added successfully" })
        } else {
            throw Error("Something went wrong while creating user")
        }
    } catch(err) {
        console.log(err)
        res.status(500).json({message: "Error while creating user"})
    }
}


const editUser = async (req, res) => {
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
            if(userExist && userExist._id != req.params.userId) {
                return res.status(409).json({message: "User already exist with this email"})
            }
        }

        const user = await User.findById(req.params.userId)

        if(user.role === 'admin') {
            return res.status(403).json({message: "Not enough permissions"})
        }
        await User.findByIdAndUpdate(req.params.userId, req.body)
        sendUpdateToUser({userId: req.params.userId, body: req.body})
        res.status(200).json({message: "User updated successfully"})
    } catch(err) {
        console.log(err)
        res.status(500).json({message: "Error while editing user"})
    }
}


const deleteUser = async (req, res) => {
    try{
        const user = await User.findById(req.params.userId)
        if(!user) {
            return res.status(404).json({message: "User not found"})
        }
        if(user.role === 'admin') {
            return res.status(403).json({message: "Not enough permissions"})
        }
        
        await User.findByIdAndDelete(req.params.userId)
        sendDeleteToUser({userId: req.params.userId})
        notifyUser(user.email)
        res.status(200).json({message: "User deleted successfully"})
    } catch(err) {
        console.log(err)
        res.status(500).json({message: "Error while deleting user"})
    }
}


const logout = async (req, res) => {
    try{
        res.clearCookie('refreshToken')
        res.status(200).json({message: "Logout successful"})
    } catch(err) {
        console.log(err)
        res.status(500).json({message: "Error while logging out"})
    }
}


export default {
    verifyAdmin,
    fetchAdmin,
    fetchUsers,
    addUser,
    editUser,
    deleteUser,
    logout
}