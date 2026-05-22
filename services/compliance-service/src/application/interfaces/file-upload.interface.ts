export interface IFileUploadService {
  upload(file: Express.Multer.File): Promise<string>
  delete(fileUrl: string): Promise<void>
}
