import express from 'express'
import controller from '../controller/controller.js'
import verifyUser, {refreshToken} from '../middleware/adminAuth.js'

const router = express.Router()


router.post('/login', controller.verifyAdmin)

router.get('/fetch-admin', verifyUser, controller.fetchAdmin)

router.get('/fetch-users', verifyUser, controller.fetchUsers)

router.post('/add-user', verifyUser, controller.addUser)

router.patch('/edit-user/:userId', verifyUser, controller.editUser)

router.delete('/delete-user/:userId', verifyUser, controller.deleteUser)

router.get('/logout', verifyUser, controller.logout)

router.get('/refresh-token', refreshToken)

export default router