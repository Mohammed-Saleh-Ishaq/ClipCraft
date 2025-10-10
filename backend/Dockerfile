FROM python:3.11-slim


# Set the working directory inside the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y ffmpeg build-essential git && rm -rf /var/lib/apt/lists/*

# Copy the requirements.txt first to take advantage of Docker caching
#COPY ./backend/app/requirements.txt ./
COPY ./app/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the rest of the app's code
COPY ./app ./app

# Expose FastAPI port 
EXPOSE 8000

# Run the FastAPI app using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
