import { v2 as cloudinary } from 'cloudinary'
import { IFileUploadService } from '../../application/interfaces/file-upload.interface'
import { createLogger } from '@certiflow/shared'

const logger = createLogger('compliance-service:cloudinary')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export class CloudinaryUploadService implements IFileUploadService {
  async upload(file: Express.Multer.File): Promise<string> {
    logger.info('Uploading file to Cloudinary', { filename: file.originalname })

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'certiflow/reports',
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result) {
            logger.error('Cloudinary upload failed', { error })
            reject(error || new Error('Upload failed'))
            return
          }

          logger.info('File uploaded successfully', { url: result.secure_url })
          resolve(result.secure_url)
        }
      )

      uploadStream.end(file.buffer)
    })
  }

  async delete(fileUrl: string): Promise<void> {
    const publicId = fileUrl.split('/').slice(-2).join('/').split('.')[0]
    await cloudinary.uploader.destroy(publicId)
    logger.info('File deleted from Cloudinary', { publicId })
  }
}
