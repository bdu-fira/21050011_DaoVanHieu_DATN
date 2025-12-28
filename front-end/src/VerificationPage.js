import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import CertificateABI from './DigitalCertificate.json';
import './App.css'; 

const contractAddress = "0xB8adf24F0F4faf9edac4E9CC1971783B617e0552";

function VerificationPage() {
  const { tokenId } = useParams();
  const [metadata, setMetadata] = useState(null);
  const [tokenOwner, setTokenOwner] = useState(""); 
  const [contractOwner, setContractOwner] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCertificateData = async () => {
      if (!tokenId) {
        setError("Không tìm thấy Token ID.");
        setLoading(false);
        return;
      }

      try {
        const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology/");
        const contract = new ethers.Contract(contractAddress, CertificateABI.abi, provider);

        // Lấy Token URI 
        const tokenURI = await contract.tokenURI(tokenId);
        const metadataUrl = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");

        // Lấy thông tin Metadata từ IPFS 
        const metadataResponse = await fetch(metadataUrl);
        if (!metadataResponse.ok) throw new Error("Không thể tải metadata từ IPFS.");
        const meta = await metadataResponse.json();

        // Lấy địa chỉ chủ sở hữu NFT (Trường Đại Học)
        const universityAddress = await contract.ownerOf(tokenId);
        setTokenOwner(universityAddress);

        // Lấy địa chỉ ví là Owner của Smart Contract
        const adminAddress = await contract.owner();
        setContractOwner(adminAddress);
        setMetadata(meta);

      } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
        setError("Xác thực thất bại. Token ID không tồn tại hoặc có lỗi xảy ra.");
      } finally {
        setLoading(false);
      }
    };

    fetchCertificateData();
  }, [tokenId]); 


  if (loading) {
    return <div className="viewer-container"><p>Đang tải và xác thực chứng chỉ...</p></div>;
  }

  if (error) {
    return <div className="viewer-container error"><p>{error}</p></div>;
  }

  const getAttributeValue = (traitType) => {
    if (!metadata || !Array.isArray(metadata.attributes)) return "N/A";
    const attribute = metadata.attributes.find(attr => attr.trait_type === traitType);
    return attribute ? attribute.value : "N/A";
  };

  const imageUrl = metadata.image ? metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/") : "";

  return (
    <div>
      <div className="project-header">
        <div className="line-one">
          <span>TRƯỜNG ĐẠI HỌC BÌNH DƯƠNG</span>
          <span>VIỆN TRÍ TUỆ NHÂN TẠO VÀ TRUYỂN ĐỔI SỐ</span>
          <span>KHOA CÔNG NGHỆ THÔNG TIN, ROBOT VÀ TRÍ TUỆ NHÂN TẠO</span>
        </div>

        <div className="line-two">
          ĐỒ ÁN TỐT NGHIỆP
          <span>TÊN ĐỀ TÀI: XÂY DỰNG ỨNG DỤNG CẤP PHÁT CHỨNG CHỈ SỐ DỰA TRÊN NỀN TẢNG BLOCKCHAIN</span>
        </div>

        <div className="name-section">
          <p>Giảng viên hướng dẫn: <strong>ThS. Dương Anh Tuấn</strong></p>
          <p>Sinh viên thực hiện: <strong>Đào Văn Hiếu</strong></p>
        </div>
        <div className="main-container">
        <img src="/logo.png"
          alt="Logo BDU"
          style={{
            width: '80px',       
            height: 'auto',       
            display: 'block',     
            margin: '0 auto 0 auto', 
            objectFit: 'contain'  
          }}
        /></div>
        <h2>Hệ thống cấp phát chứng chỉ số BDU</h2>
      </div>
      
    
      <div className="viewer-page-container">
        <div className="viewer-cert-column">
          <img src={imageUrl} alt={metadata.name} />
        </div>

        <div className="viewer-panel-column">
          <div className="viewer-panel">
            <div className="panel-section valid">
              <strong>Chứng chỉ hợp lệ</strong>
            </div>

            <div className="panel-section">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span className="label" style={{ marginRight: '8px' }}>Họ tên sinh viên:</span>
                <strong>{getAttributeValue("Tên sinh viên")}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span className="label" style={{ marginRight: '8px' }}>MSSV:</span>
                <strong>{getAttributeValue("MSSV")}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="label" style={{ marginRight: '8px' }}>Lớp:</span>
                <strong>{getAttributeValue("Lớp")}</strong>
              </div>
            </div>

            <div className="panel-section">
              <span className="label">Đơn vị cấp phát:</span>
              <strong>Trường Đại học Bình Dương</strong>
              <a href={`https://amoy.polygonscan.com/address/${tokenOwner}`} target="_blank" rel="noopener noreferrer">
                {tokenOwner}
              </a>
            </div>

            <div className="panel-section">
              <span className="label">Đơn vị xác thực:</span>
              <a href={`https://amoy.polygonscan.com/address/${contractOwner}`} target="_blank" rel="noopener noreferrer">
                {contractOwner}
              </a>
              <a href={`https://amoy.polygonscan.com/nft/${contractAddress}/${tokenId}`} target="_blank" rel="noopener noreferrer" style={{ marginTop: '10px', fontSize: '0.9em' }}>
                Xem trên nền tảng Blockchain
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerificationPage;