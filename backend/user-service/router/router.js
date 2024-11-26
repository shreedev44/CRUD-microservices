import express from 'express'
import controller from '../controller/controller.js'
import verifyUser, {refreshToken} from '../middleware/userAuth.js'


const router = express.Router()


router.post('/signup', controller.register)

router.post('/login', controller.verifyUser)

router.get('/fetch-user', verifyUser, controller.fetchUser)

router.patch('/update-profile', verifyUser, controller.updateProfile)

router.get('refresh-token', refreshToken)

export default router