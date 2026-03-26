const WEBHOOK_URL = "https://faithtemporosa.app.n8n.cloud/webhook/51c33549-c25b-44b1-9c63-470c7222b2c4";

export const sendPDFToWebhook = async (pdfBlob: Blob, filename: string): Promise<void> => {
  try {
    // Try multipart/form-data first
    const formData = new FormData();
    formData.append('file', pdfBlob, filename);

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      console.log('PDF sent successfully via multipart/form-data');
      return;
    }

    // If multipart fails, fallback to Base64
    console.warn('Multipart upload failed, falling back to Base64');
    await sendPDFAsBase64(pdfBlob, filename);
  } catch (error) {
    console.error('Error sending PDF via multipart, trying Base64 fallback:', error);
    // Fallback to Base64 on any error
    try {
      await sendPDFAsBase64(pdfBlob, filename);
    } catch (base64Error) {
      console.error('Base64 fallback also failed:', base64Error);
      throw new Error('Failed to send PDF to webhook using both methods');
    }
  }
};

const sendPDFAsBase64 = async (pdfBlob: Blob, filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      try {
        const base64data = reader.result as string;
        // Remove data URL prefix to get just the base64 string
        const base64String = base64data.split(',')[1];

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: filename,
            file: base64String,
            encoding: 'base64',
            contentType: 'application/pdf',
          }),
        });

        if (response.ok) {
          console.log('PDF sent successfully via Base64');
          resolve();
        } else {
          reject(new Error(`Base64 upload failed: ${response.statusText}`));
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read PDF blob'));
    };

    reader.readAsDataURL(pdfBlob);
  });
};
