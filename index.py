import React, { useState, useRef, useEffect, useCallback } from 'react';

// Main App Component
const App = () => {
  const [fileContent, setFileContent] = useState('');
  const [extractedData, setExtractedData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [downloadFormats, setDownloadFormats] = useState(['csv']);
  const [textInput, setTextInput] = useState('');
  const [selectedPrefix, setSelectedPrefix] = useState('');
  const [customPrefix, setCustomPrefix] = useState('');
  const [selectedSuffix, setSelectedSuffix] = useState('');
  const [customSuffix, setCustomSuffix] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [activePreviewFormat, setActivePreviewFormat] = useState(null);
  const [imageUrl, setImageUrl] = useState(''); // State to hold the uploaded image URL

  const fileInputRef = useRef(null);
  const fileReader = new FileReader();

  // Show a temporary message
  const showMessage = (text, duration = 3000) => {
    setMessage(text);
    setTimeout(() => setMessage(''), duration);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Helper to format mobile numbers to +92...
  const formatMobileNumber = (number) => {
    if (!number) return '';
    const digits = number.replace(/\D/g, ''); // Remove all non-numeric characters
    if (digits.startsWith('92') && digits.length >= 11) {
      return `+${digits}`;
    }
    if (digits.startsWith('0') && digits.length === 11) {
      return `+92${digits.substring(1)}`;
    }
    if (digits.startsWith('3') && digits.length === 10) {
        return `+92${digits}`;
    }
    return digits;
  };

  // --- Parsing Logic ---

  // Function to process unstructured text with AI, including text from OCR
  const processTextWithAI = async (text, imageData = null) => {
    setIsAiProcessing(true);
    let retries = 0;
    const maxRetries = 5;
    const baseDelay = 1000;
    
    // The prompt guides the AI to perform OCR and then structure the data
    const prompt = `You are a data extraction bot. Your task is to extract political contact information from the following text (which may be from an image) and return it as a structured JSON array. Each object in the array must have the following keys:
    'name', 'constituency', 'party', 'fatherHusbandName', 'email', 'mobilePhone1', 'mobilePhone2', 'mobilePhone3', 'address', 'placeOfBirth', 'maritalStatus', 'religion', 'assemblyTenure', 'notes', 'academicQualifications', 'schooling', 'partyAffiliation'.

    If a key's value is not present in the text, use an empty string. Combine multiple mobile numbers into 'mobilePhone1', 'mobilePhone2', etc. Use the provided keys exactly as they are.

    Here is the text to parse:
    ${text}`;

    // Payload for the API call
    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: prompt },
                ]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        "name": { "type": "STRING" },
                        "constituency": { "type": "STRING" },
                        "party": { "type": "STRING" },
                        "fatherHusbandName": { "type": "STRING" },
                        "email": { "type": "STRING" },
                        "mobilePhone1": { "type": "STRING" },
                        "mobilePhone2": { "type": "STRING" },
                        "mobilePhone3": { "type": "STRING" },
                        "address": { "type": "STRING" },
                        "placeOfBirth": { "type": "STRING" },
                        "maritalStatus": { "type": "STRING" },
                        "religion": { "type": "STRING" },
                        "assemblyTenure": { "type": "STRING" },
                        "notes": { "type": "STRING" },
                        "academicQualifications": { "type": "STRING" },
                        "schooling": { "type": "STRING" },
                        "partyAffiliation": { "type": "STRING" }
                    },
                    required: ["name", "constituency", "party", "fatherHusbandName", "email", "mobilePhone1", "mobilePhone2", "mobilePhone3", "address", "placeOfBirth", "maritalStatus", "religion", "assemblyTenure", "notes", "academicQualifications", "schooling", "partyAffiliation"]
                }
            }
        }
    };
    
    // If image data is provided, add it to the payload for OCR
    if (imageData) {
        payload.contents[0].parts.push({
            inlineData: {
                mimeType: "image/png", // Assuming image is converted to PNG format
                data: imageData
            }
        });
    }

    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    while (retries < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
          const jsonString = result.candidates[0].content.parts[0].text;
          const parsedData = JSON.parse(jsonString);
          setIsAiProcessing(false);
          return parsedData;
        } else {
          throw new Error("AI response format is unexpected.");
        }
      } catch (error) {
        console.error("AI processing failed, retrying...", error);
        retries++;
        if (retries < maxRetries) {
          await new Promise(res => setTimeout(res, baseDelay * Math.pow(2, retries)));
        } else {
          setIsAiProcessing(false);
          showMessage('Failed to process text with AI after multiple attempts. Please try again.');
          return [];
        }
      }
    }
    return [];
  };

  // CSV parsing (remains the same)
  const parseCsv = useCallback((text) => {
    const rows = text.split('\n').filter(row => row.trim() !== '');
    if (rows.length === 0) return [];
    const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length === headers.length) {
        const rowObject = {};
        headers.forEach((header, index) => {
          rowObject[header] = values[index];
        });
        data.push(rowObject);
      }
    }
    return data;
  }, []);

  // VCF parsing (remains the same)
  const parseVcf = useCallback((text) => {
    const data = [];
    const vcards = text.split('BEGIN:VCARD').filter(v => v.trim() !== '');

    vcards.forEach(vcard => {
      const contact = {};
      const lines = vcard.split('\n').filter(l => l.trim() !== '');

      lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        if (key && value) {
          if (key.startsWith('FN')) contact.name = value;
          if (key.startsWith('N')) {
            const parts = value.split(';');
            contact.name = parts[0];
          }
          if (key.startsWith('TEL')) {
            if (!contact.mobile) contact.mobile = [];
            contact.mobile.push(value);
          }
          if (key.startsWith('EMAIL')) contact.email = value;
          if (key.startsWith('ADR')) contact.address = value.split(';').pop().trim();
          if (key.startsWith('ORG')) contact.party = value;
        }
      });
      data.push(contact);
    });
    return data;
  }, []);

  // Handler to process content from various sources (file, paste)
  const handleContentProcessing = async (content, filename = 'pasted_data.txt', imageType = null) => {
    setIsProcessing(true);
    setFileContent(content);
    let parsedData = [];

    if (imageType) {
        // If it's an image, pass the base64 content to the AI for OCR and data extraction
        parsedData = await processTextWithAI('', content);
    } else if (filename.includes('.csv')) {
        parsedData = parseCsv(content);
    } else if (filename.includes('.vcf')) {
        parsedData = parseVcf(content);
    } else {
        parsedData = await processTextWithAI(content);
    }

    // Post-processing to format mobile numbers
    const formattedData = parsedData.map(contact => {
        const newContact = { ...contact };
        if (newContact.mobilePhone1) {
            newContact.mobilePhone1 = formatMobileNumber(newContact.mobilePhone1);
        }
        if (newContact.mobilePhone2) {
            newContact.mobilePhone2 = formatMobileNumber(newContact.mobilePhone2);
        }
        if (newContact.mobilePhone3) {
            newContact.mobilePhone3 = formatMobileNumber(newContact.mobilePhone3);
        }
        return newContact;
    });
    
    setExtractedData(formattedData);
    if (formattedData.length > 0) {
      // Use a predefined, ordered list of columns for consistency
      const predefinedColumns = [
        { id: 'name', label: 'Name', visible: true },
        { id: 'assemblyTenure', label: 'Tenure', visible: true },
        { id: 'constituency', label: 'Constituency', visible: true },
        { id: 'fatherHusbandName', label: 'Father /Husband Name', visible: true },
        { id: 'party', label: 'Party', visible: true },
        { id: 'placeOfBirth', label: 'Place of Birth', visible: true },
        { id: 'address', label: 'Permanent Address', visible: true },
        { id: 'mobilePhone1', label: 'Mobile 1', visible: true },
        { id: 'mobilePhone2', label: 'Mobile 2', visible: true },
        { id: 'mobilePhone3', label: 'Mobile 3', visible: true },
        { id: 'email', label: 'Email', visible: true },
        { id: 'academicQualifications', label: 'Academic Qualifications', visible: true },
        { id: 'schooling', label: 'Schooling', visible: true },
        { id: 'partyAffiliation', label: 'Party Affiliation', visible: true },
        { id: 'notes', label: 'Notes', visible: true },
      ];

      // Filter to only include columns that are present in the data
      const initialColumns = predefinedColumns.filter(col => formattedData[0].hasOwnProperty(col.id));
      setColumns(initialColumns);
    }
    setIsProcessing(false);
    setTextInput('');
  };

  // Handle file upload
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          // Set the image URL for preview
          setImageUrl(e.target.result);
          // Extract base64 string from the result
          const base64String = e.target.result.split(',')[1];
          handleContentProcessing(base64String, file.name, 'image');
        };
        reader.readAsDataURL(file);
      } else {
        // Handle text files
        setImageUrl('');
        fileReader.onload = (e) => {
          handleContentProcessing(e.target.result, file.name);
        };
        fileReader.readAsText(file);
      }
    }
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    const text = e.dataTransfer.getData('text/plain');

    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImageUrl(event.target.result);
          const base64String = event.target.result.split(',')[1];
          handleContentProcessing(base64String, file.name, 'image');
        };
        reader.readAsDataURL(file);
      } else {
        setImageUrl('');
        fileReader.onload = (event) => {
          handleContentProcessing(event.target.result, file.name);
        };
        fileReader.readAsText(file);
      }
    } else if (text) {
      setImageUrl('');
      handleContentProcessing(text);
    }
  };

  // Update a column's label or visibility
  const updateColumn = (id, newValues) => {
    setColumns(prevColumns =>
      prevColumns.map(col =>
        col.id === id ? { ...col, ...newValues } : col
      )
    );
  };

  // Drag and drop functionality for columns
  const handleColumnDragStart = (e, index) => {
    e.dataTransfer.setData('colIndex', index);
  };

  const handleColumnDragOver = (e) => {
    e.preventDefault();
  };

  const handleColumnDrop = (e, newIndex) => {
    e.preventDefault();
    const oldIndex = e.dataTransfer.getData('colIndex');
    const newColumns = [...columns];
    const [movedColumn] = newColumns.splice(oldIndex, 1);
    newColumns.splice(newIndex, 0, movedColumn);
    setColumns(newColumns);
  };
  
  // Export Logic for different formats
  const getProcessedData = () => {
    const processedData = JSON.parse(JSON.stringify(extractedData));
    const prefix = selectedPrefix === 'custom' ? customPrefix : selectedPrefix;
    const suffix = selectedSuffix === 'custom' ? customSuffix : selectedSuffix;

    if (prefix || suffix) {
      return processedData.map(contact => {
        let newName = contact.name;
        if (newName) {
          if (prefix) {
            newName = `${prefix} ${newName}`;
          }
          if (suffix) {
            newName = `${newName} ${suffix}`;
          }
        }
        return { ...contact, name: newName };
      });
    }
    return processedData;
  };

  // Generate CSV content
  const generateCsv = () => {
    const dataToExport = getProcessedData();
    const visibleColumns = columns.filter(col => col.visible);
    const headers = visibleColumns.map(col => `"${col.label.replace(/"/g, '""')}"`);
    const rows = dataToExport.map(row => 
      visibleColumns.map(col => `"${(row[col.id] || '').toString().replace(/"/g, '""')}"`).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  // Generate VCF content
  const generateVcf = () => {
    const dataToExport = getProcessedData();
    let vcfContent = '';
    dataToExport.forEach(row => {
      vcfContent += 'BEGIN:VCARD\n';
      vcfContent += 'VERSION:3.0\n';
      if (row.name) vcfContent += `FN:${row.name}\n`;
      if (row.name) vcfContent += `N:${row.name};;;;\n`;
      if (row.email) vcfContent += `EMAIL;TYPE=INTERNET:${row.email}\n`;
      
      Object.keys(row).filter(key => key.startsWith('mobilePhone')).forEach(key => {
        if (row[key]) {
          vcfContent += `TEL;TYPE=CELL:${row[key].trim()}\n`;
        }
      });
      
      if (row.address) vcfContent += `ADR;TYPE=WORK:;;${row.address}\n`;
      if (row.party) vcfContent += `ORG:${row.party}\n`;

      // Custom fields to preserve all data
      if (row.assemblyTenure) vcfContent += `X-ASSEMBLY-TENURE:${row.assemblyTenure}\n`;
      if (row.fatherHusbandName) vcfContent += `X-FATHER-HUSBAND-NAME:${row.fatherHusbandName}\n`;
      if (row.constituency) vcfContent += `X-CONSTITUENCY:${row.constituency}\n`;
      if (row.placeOfBirth) vcfContent += `X-PLACE-OF-BIRTH:${row.placeOfBirth}\n`;
      if (row.maritalStatus) vcfContent += `X-MARITAL-STATUS:${row.maritalStatus}\n`;
      if (row.religion) vcfContent += `X-RELIGION:${row.religion}\n`;
      if (row.notes) vcfContent += `X-NOTES:${row.notes}\n`;
      if (row.academicQualifications) vcfContent += `X-ACADEMIC-QUALIFICATIONS:${row.academicQualifications}\n`;
      if (row.schooling) vcfContent += `X-SCHOOLING:${row.schooling}\n`;
      if (row.partyAffiliation) vcfContent += `X-PARTY-AFFILIATION:${row.partyAffiliation}\n`;

      vcfContent += 'END:VCARD\n';
    });
    return vcfContent;
  };

  // Generate TXT content
  const generateTxt = () => {
    const dataToExport = getProcessedData();
    const visibleColumns = columns.filter(col => col.visible);
    const textContent = dataToExport.map(row => 
      visibleColumns.map(col => `${col.label}: ${row[col.id] || 'N/A'}`).join('\n')
    ).join('\n\n' + '='.repeat(40) + '\n\n');
    return textContent;
  };

  // Handle the export based on selected format
  const handleExport = () => {
    const visibleColumns = columns.filter(col => col.visible);
    if (visibleColumns.length === 0) {
      showMessage('Please select at least one field to export.');
      return;
    }

    if (downloadFormats.length === 0) {
      showMessage('Please select at least one download format.');
      return;
    }

    downloadFormats.forEach(format => {
      let fileContent;
      let fileName;
      let mimeType;

      switch (format) {
        case 'csv':
          fileContent = generateCsv();
          fileName = 'formatted_contacts.csv';
          mimeType = 'text/csv';
          break;
        case 'vcf':
          fileContent = generateVcf();
          fileName = 'formatted_contacts.vcf';
          mimeType = 'text/vcard';
          break;
        case 'txt':
          fileContent = generateTxt();
          fileName = 'formatted_contacts.txt';
          mimeType = 'text/plain';
          break;
        default:
          showMessage(`Invalid download format: ${format}`);
          return;
      }
      
      const blob = new Blob([fileContent], { type: `${mimeType};charset=utf-8;` });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });

    showMessage(`Successfully downloaded as ${downloadFormats.join(', ').toUpperCase()} files!`);
  };

  // Handle checkbox change for formats
  const handleFormatChange = (format) => {
    setDownloadFormats(prevFormats =>
      prevFormats.includes(format)
        ? prevFormats.filter(f => f !== format)
        : [...prevFormats, format]
    );
  };
  
  const handleTextInputChange = (e) => {
    setTextInput(e.target.value);
  };

  const handleProcessTextInput = () => {
    if (textInput.trim()) {
      setImageUrl(''); // Clear image preview for text input
      handleContentProcessing(textInput, 'pasted_text.txt');
    }
  };

  // Handle preview generation
  const handlePreview = (format) => {
    setActivePreviewFormat(format);
    let content = '';
    switch (format) {
      case 'csv':
        content = generateCsv();
        break;
      case 'vcf':
        content = generateVcf();
        break;
      case 'txt':
        content = generateTxt();
        break;
      default:
        content = 'Invalid format selected.';
    }
    setPreviewContent(content);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'} p-4 transition-colors duration-300`}>
      <div className="container mx-auto max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 drop-shadow-lg">
            Universal Contact Data Processor 🚀
          </h1>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-md transition-all duration-300 hover:scale-105"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>

        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 max-w-3xl">
          Upload text files, paste text, or upload an image to extract, clean, and format contact information.
          Supported formats: <strong className="font-semibold">.txt, .csv, .vcf, .jpg, .png</strong>.
        </p>

        {/* File Upload / Drag & Drop / Paste Section */}
        <div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 transition-colors duration-200">
            <p className="text-gray-500 dark:text-gray-400 mb-4 text-center">Drag & Drop a file or paste text below.</p>
            <label htmlFor="file-upload" className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-bold">
              <span className="text-center">Click to upload your file</span>
              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".txt,.csv,.vcf,image/*" // Updated accept attribute
              />
            </label>
            <textarea
              className="mt-4 w-full p-4 h-32 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Or paste your text content here..."
              value={textInput}
              onChange={handleTextInputChange}
            />
            <button
              onClick={handleProcessTextInput}
              className="mt-4 px-6 py-2 bg-blue-600 text-white font-bold rounded-full shadow-md hover:bg-blue-700 transition-all duration-300"
            >
              Process Text
            </button>
          </div>
        </div>

        {/* Message Box */}
        {(message || isAiProcessing) && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white p-4 rounded-xl shadow-2xl z-50 transition-all duration-300">
            <p className="text-lg font-semibold">{isAiProcessing ? 'AI is intelligently processing your data... 🤖' : message}</p>
          </div>
        )}

        {/* Data Preview and Controls */}
        {extractedData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Formatting & Arrangement
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Use the controls below to customize your data. Drag and drop the labels to reorder columns.
            </p>

            {/* Image Preview */}
            {imageUrl && (
                <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl shadow-inner">
                    <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Uploaded Image Preview</h3>
                    <img src={imageUrl} alt="Uploaded for processing" className="max-w-full h-auto rounded-lg shadow-md border border-gray-300 dark:border-gray-600" />
                </div>
            )}

            {/* Column Control UI */}
            <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl shadow-inner">
              <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">
                Column Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {columns.map((col, index) => (
                  <div
                    key={col.id}
                    className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    draggable
                    onDragStart={(e) => handleColumnDragStart(e, index)}
                    onDragOver={handleColumnDragOver}
                    onDrop={(e) => handleColumnDrop(e, index)}
                  >
                    <div className="flex-none">
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={(e) => updateColumn(col.id, { visible: e.target.checked })}
                        className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                    </div>
                    <input
                      type="text"
                      value={col.label}
                      onChange={(e) => updateColumn(col.id, { label: e.target.value })}
                      className="flex-grow p-2 rounded-md bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Table */}
            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Live Preview
            </h3>
            <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {columns.filter(col => col.visible).map(col => (
                      <th
                        key={col.id}
                        className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {extractedData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                      {columns.filter(col => col.visible).map(col => (
                        <td
                          key={`${rowIndex}-${col.id}`}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200"
                        >
                          {row[col.id]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Prefix and Suffix Options */}
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-2xl shadow-inner">
              <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">
                Add Prefixes & Suffixes to Name
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Prefix Section */}
                <div>
                  <label htmlFor="prefix-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select a Prefix:
                  </label>
                  <select
                    id="prefix-select"
                    value={selectedPrefix}
                    onChange={(e) => {
                      setSelectedPrefix(e.target.value);
                      if (e.target.value !== 'custom') setCustomPrefix('');
                    }}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 dark:border-gray-600"
                  >
                    <option value="">None</option>
                    <option value="MNA">MNA</option>
                    <option value="MPA">MPA</option>
                    <option value="Adv">Adv</option>
                    <option value="custom">Custom...</option>
                  </select>
                  {selectedPrefix === 'custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom prefix"
                      value={customPrefix}
                      onChange={(e) => setCustomPrefix(e.target.value)}
                      className="mt-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800"
                    />
                  )}
                </div>

                {/* Suffix Section */}
                <div>
                  <label htmlFor="suffix-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select a Suffix:
                  </label>
                  <select
                    id="suffix-select"
                    value={selectedSuffix}
                    onChange={(e) => {
                      setSelectedSuffix(e.target.value);
                      if (e.target.value !== 'custom') setCustomSuffix('');
                    }}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 dark:border-gray-600"
                  >
                    <option value="">None</option>
                    <option value="Sindh">Sindh</option>
                    <option value="Punjab">Punjab</option>
                    <option value="custom">Custom...</option>
                  </select>
                  {selectedSuffix === 'custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom suffix"
                      value={customSuffix}
                      onChange={(e) => setCustomSuffix(e.target.value)}
                      className="mt-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* File Content Preview Section */}
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-2xl shadow-inner">
              <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">
                File Content Preview
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Click a button to see what your file will look like before you download it.
              </p>
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => handlePreview('csv')}
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    activePreviewFormat === 'csv'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  .csv Preview
                </button>
                <button
                  onClick={() => handlePreview('vcf')}
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    activePreviewFormat === 'vcf'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  .vcf Preview
                </button>
                <button
                  onClick={() => handlePreview('txt')}
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    activePreviewFormat === 'txt'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  .txt Preview
                </button>
              </div>
              {previewContent && (
                <pre className="mt-4 p-4 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg overflow-auto max-h-96">
                  {previewContent}
                </pre>
              )}
            </div>
            
            {/* Export Button & Format Options */}
            <div className="flex flex-col md:flex-row justify-center items-center mt-8 space-y-4 md:space-y-0 md:space-x-4">
              <div className="flex items-center space-x-4">
                <label className="font-semibold text-lg">Download as:</label>
                <div className="flex space-x-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="csv-format"
                      name="download-format"
                      value="csv"
                      checked={downloadFormats.includes('csv')}
                      onChange={() => handleFormatChange('csv')}
                      className="h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="csv-format" className="ml-2 text-gray-700 dark:text-gray-300">.csv (Excel)</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="vcf-format"
                      name="download-format"
                      value="vcf"
                      checked={downloadFormats.includes('vcf')}
                      onChange={() => handleFormatChange('vcf')}
                      className="h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="vcf-format" className="ml-2 text-gray-700 dark:text-gray-300">.vcf</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="txt-format"
                      name="download-format"
                      value="txt"
                      checked={downloadFormats.includes('txt')}
                      onChange={() => handleFormatChange('txt')}
                      className="h-4 w-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="txt-format" className="ml-2 text-gray-700 dark:text-gray-300">.txt</label>
                  </div>
                </div>
              </div>
              <button
                onClick={handleExport}
                className="px-8 py-3 bg-purple-600 text-white font-bold rounded-full shadow-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
              >
                Download File(s)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
