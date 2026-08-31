import uuid
from pathlib import Path

import fitz

from fastapi import FastAPI, UploadFile, File,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from extraction.ocr.processor import process_certificate
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
async def predict(file: UploadFile = File(...)):

    print("========== PREDICTION REQUEST ==========")

    print("Filename:", file.filename)

    extension = Path(file.filename).suffix.lower()

    file_id = str(uuid.uuid4())

    original_path = (
        UPLOAD_DIR /
        f"{file_id}{extension}"
    )


    # Save uploaded file

    contents = await file.read()

    with open( original_path, "wb" ) as f:
        f.write(contents)
    print( "File saved:", original_path )
    image_path = original_path

    # If PDF, convert first page to PNG

    if extension == ".pdf":
        print( "PDF detected. Converting first page to image..." )
        pdf_document = fitz.open( original_path )
        first_page = pdf_document.load_page( 0 )


        pix = first_page.get_pixmap(
            matrix=fitz.Matrix(
                2,
                2
            )
        )


        image_path = (
            UPLOAD_DIR /
            f"{file_id}.png"
        )


        pix.save(
            str(image_path)
        )


        pdf_document.close()


        print(
            "PDF converted to:",
            image_path
        )


    # Run ML prediction

    result = predict_image(
        image_path
    )


    print(
        "Prediction completed:",
        result
    )


    # Cleanup

    if original_path.exists():

        original_path.unlink()


    if (
        image_path != original_path
        and image_path.exists()
    ):

        image_path.unlink()


    return {

        "success": True,

        "result": result

    }
    
    
@app.post("/extract")
async def extract(file: UploadFile = File(...)):

    print("========== EXTRACTION REQUEST ==========")
    print("Filename:", file.filename)

    # Generate a unique filename
    file_extension = Path(file.filename).suffix

    unique_filename = (
        f"{uuid.uuid4()}{file_extension}"
    )

    file_path = (
        UPLOAD_DIR / unique_filename
    )

    try:

        # Save uploaded certificate
        contents = await file.read()

        with open(file_path, "wb") as f:
            f.write(contents)

        print(
            "Certificate saved:",
            file_path
        )

        # Run OCR extraction
        print(
            "Starting OCR extraction..."
        )

        result = process_certificate(
            file_path,
            save_output=False
        )

        print(
            "OCR extraction completed"
        )

        print(
            "Pages extracted:",
            result["page_count"]
        )

        return {
            "success": True,
            "result": result
        }

    except Exception as e:

        print(
            "========== EXTRACTION ERROR =========="
        )

        print(
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        # Delete temporary uploaded certificate
        if file_path.exists():

            file_path.unlink()

            print(
                "Temporary extraction file deleted"
            )