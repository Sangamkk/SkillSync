import os
import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from detection.predict import predict_image


app = FastAPI(
    title="SkillSync ML Service"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.get("/")
def home():
    return {
        "message": "SkillSync ML Service Running"
    }


@app.post("/predict")
async def predict_certificate(
    file: UploadFile = File(...)
):

    try:

        allowed_extensions = {
            ".jpg",
            ".jpeg",
            ".png"
        }

        file_extension = Path(
            file.filename
        ).suffix.lower()

        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail="Only JPG, JPEG and PNG files are supported"
            )


        unique_filename = (
            f"{uuid.uuid4()}{file_extension}"
        )

        file_path = (
            UPLOAD_DIR / unique_filename
        )


        with open(
            file_path,
            "wb"
        ) as buffer:

            content = await file.read()

            buffer.write(content)


        result = predict_image(
            file_path
        )


        os.remove(file_path)


        return {
            "success": True,
            "result": result
        }


    except Exception as error:

        if "file_path" in locals() and file_path.exists():
            os.remove(file_path)

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )