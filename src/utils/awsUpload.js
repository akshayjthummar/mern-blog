import aws from "aws-sdk";
import { nanoid } from "nanoid";

// settings up s3 bucket
const s3 = new aws.S3({
  region: "ap-south-1",
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const generateUploadUrl = async () => {
  const date = new Date();
  const imageName = `${nanoid()}-${date.getTime()}.jpeg`;
  return await s3.getSignedUrlPromise("putObject", {
    Bucket: "blog-website-for-learning",
    Key: imageName,
    Expires: 1000,
    ContentType: "image/jpeg",
  });
};
