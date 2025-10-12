
#FROM python:3.11-slim


# Set the working directory inside the container
##WORKDIR /app

# Install system dependencies
##RUN apt-get update && apt-get install -y ffmpeg build-essential git && rm -rf /var/lib/apt/lists/*

# Copy the requirements.txt first to take advantage of Docker caching
#COPY ./backend/app/requirements.txt ./
##COPY ./app/requirements.txt ./

# Install Python dependencies
##RUN pip install --no-cache-dir -r requirements.txt

# Now copy the rest of the app's code
#COPY ./app ./app
##COPY app .
# Expose FastAPI port 
##EXPOSE 8000

# Run the FastAPI app using uvicorn
#CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
##CMD ["python", "-m", "app.main"]
# double comment was earlier

FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y ffmpeg build-essential git && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY ./app/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire app directory into the container
COPY ./app ./app

# Set working directory to the app package
WORKDIR /app/app

# Run the app as a module so relative imports work
CMD ["python", "-m", "main"]
