function downloadBlob(data, fileName, mimeType) {
  const blob = new Blob([data], {
    type: mimeType,
  });
  const url = window.URL.createObjectURL(blob);
  downloadURL(url, fileName);
  setTimeout(function () {
    return window.URL.revokeObjectURL(url);
  }, 1000);
}

function downloadURL(data, fileName) {
  const a = document.createElement("a");
  a.href = data;
  a.download = fileName;
  document.body.appendChild(a);
  a.style = "display: none";
  a.click();
  a.remove();
}

async function uploadFiles(files) {
  for (const file of files) {
    const res = await fetch("/attachment", {
      method: "POST",
      body: JSON.stringify({
        name: file.name,
        eventId: document.getElementById("eventId").value,
        fileSize: file.size,
        fileType: file.type,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (res.status !== 201)
      alert(`Failed to get upload link for ${file.name}.`);
    const {
      id,
      fileName,
      eventId,
      fileSize,
      fileType,
      blockSize,
      firstBlockId,
      lastBlockId,
    } = await res.json();

    for (let blockId = firstBlockId; blockId <= lastBlockId; blockId++) {
      const start = blockId * blockSize;
      const end = Math.min((blockId + 1) * blockSize, fileSize);

      const chunkBlob = file.slice(start, end);

      const res = await fetch(
        `/attachment/upload?id=${encodeURIComponent(id)}&blockId=${blockId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
          },
          body: chunkBlob,
        }
      );

      if (!res.ok) {
        alert(
          `Failed to upload block ${blockId} for ${file.name}. Status: ${res.status}`
        );
        break;
      }
    }
  }
}

async function downloadFile(attachmentId) {
  const res = await fetch(`/attachment/?id=${attachmentId}`);
  if (res.status !== 200) alert("Could not get attachment information");

  const {
    id,
    fileName,
    eventId,
    fileSize,
    fileType,
    blockSize,
    firstBlockId,
    lastBlockId,
  } = await res.json();

  const fileBuf = new Uint8Array(fileSize);
  let cursor = 0;

  for (let blockId = firstBlockId; blockId <= lastBlockId; blockId++) {
    console.log(blockId, "blockID");
    const res = await fetch(
      `/attachment/download?id=${attachmentId}&blockId=${blockId}`
    );
    if (res.status !== 200)
      alert(
        `Could not download block ${blockId} from attachment ${attachmentId}`
      );

    fileBuf.set(await res.bytes(), cursor);
    cursor += Number(res.headers.get("content-length"));
  }

  return { fileName, fileType, fileSize, fileBuf };
}

async function listAttachments(eventId) {
  const res = await fetch(`/attachment/event?eventId=${eventId}`);
  if (res.status !== 200) {
    alert("Could not get attachments");
    return [];
  }
  return await res.json();
}

async function deleteAttachment(attachmentId) {
  const res = await fetch(`/attachment?id=${attachmentId}`, {
    method: "DELETE",
  });
  if (res.status !== 204) {
    alert("Could not delete attachment");
  }
}
