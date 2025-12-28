import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import CertificateABI from './DigitalCertificate.json';
import { QRCodeCanvas } from 'qrcode.react';
import 'chart.js/auto';
import { Pie, Bar } from 'react-chartjs-2';
import './App.css'; 

// Cấu hình thông tin kết nối
const contractAddress = "0xB8adf24F0F4faf9edac4E9CC1971783B617e0552";
const correctChainIdDecimal = "80002";
const correctChainId = "0x13882";
const PINATA_API_KEY = process.env.REACT_APP_PINATA_API_KEY;
const PINATA_API_SECRET = process.env.REACT_APP_PINATA_API_SECRET;


// Component để hiển thị một thẻ chứng chỉ
function CertificateCard({ metadata }) {
  const imageUrl = metadata.image ? metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/") : "";
  const verificationUrl = metadata.tokenId ? `${window.location.origin}/verify/${metadata.tokenId}` : "";
  const qrRef = useRef(null);

  // Hàm xử lý download ảnh CÓ NHÚNG QR CODE
  const handleDownloadWithQR = () => {
    if (!imageUrl) return;

    const canvas = document.createElement('canvas'); 
    const ctx = canvas.getContext('2d');
    const certImage = new Image();
    certImage.crossOrigin = "anonymous"; 

    certImage.onload = () => {
      canvas.width = certImage.naturalWidth;
      canvas.height = certImage.naturalHeight;
      ctx.drawImage(certImage, 0, 0);

      const qrCanvas = qrRef.current?.querySelector('canvas');
      if (qrCanvas) {
        const qrSize = Math.min(canvas.width * 0.12, canvas.height * 0.12);
        const qrPaddingX = canvas.width * 0.09;  
        const qrPaddingY = canvas.height * 0.12;
        const qrX = canvas.width - qrSize - qrPaddingX; 
        const qrY = canvas.height - qrSize - qrPaddingY; 
        ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
      }

      // Tạo link download từ canvas đã vẽ
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = dataUrl;
      const fileName = metadata.name ? metadata.name.replace(/\s+/g, '_') + '.png' : 'certificate.png';
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    certImage.onerror = (error) => {
      console.error('Lỗi tải ảnh chứng chỉ:', error);
      alert('Không thể tải ảnh gốc để nhúng QR code. Vui lòng kiểm tra link ảnh hoặc thử lại.');
    };

    certImage.src = imageUrl; 


  };

  // Hàm lấy giá trị thuộc tính từ metadata
  const getAttributeValue = (traitType) => {
    if (!metadata || !Array.isArray(metadata.attributes)) {
      return "N/A"; 
    }
    const attribute = metadata.attributes.find(attr => attr.trait_type === traitType);
    return attribute ? attribute.value : "N/A";
  };


  return (
    <div className="certificate-card">
      <img src={imageUrl} alt={metadata.name} />
      <h4>{metadata.name}</h4>
      <b>{getAttributeValue("Tên sinh viên")} - </b>
      <b>{getAttributeValue("MSSV")} </b>
      <b>{getAttributeValue("Lớp")}</b>

      <div ref={qrRef} style={{ display: 'none' }}>
        {verificationUrl && <QRCodeCanvas value={verificationUrl} size={256} />}
      </div>

      {verificationUrl && (
        <p style={{ fontSize: '20px', wordBreak: 'break-all', marginTop: '15px' }}>
          <a href={verificationUrl} target="_blank" rel="noopener noreferrer">
            Link xác thực
          </a>
        </p>
      )}

      {imageUrl && (
        <button onClick={handleDownloadWithQR} className="btn-download">
          Tải chứng chỉ
        </button>
      )}
    </div>
  );
}

function App() {
  // State quản lý trạng thái của ứng dụng
  const [walletAddress, setWalletAddress] = useState("");
  const [status, setStatus] = useState("");
  const [myCertificates, setMyCertificates] = useState([]);
  const [newCertStudentId, setNewCertStudentId] = useState("");
  const [newCertStudentName, setNewCertStudentName] = useState("");
  const [newCertStudentClass, setNewCertStudentClass] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  // State cho form cấp chứng chỉ mới
  const [newCertStudentAddress, setNewCertStudentAddress] = useState("");
  const [newCertName, setNewCertName] = useState("");
  const [newCertDescription, setNewCertDescription] = useState("");
  const [newCertImage, setNewCertImage] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Hàm kiểm tra mạng hiện tại và yêu cầu chuyển mạng nếu không đúng
  const checkAndSwitchNetwork = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      // Kiểm tra xem mạng hiện tại có phải là Polygon Amoy không
      if (network.chainId.toString() !== correctChainIdDecimal) {
        setStatus("Mạng không đúng. Vui lòng chuyển sang Polygon Amoy Testnet.");
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: correctChainId }],
        });
      }
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          // Gửi yêu cầu thêm mạng Polygon Amoy
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: correctChainId,
                chainName: "Polygon Amoy Testnet",
                rpcUrls: ["https://rpc-amoy.polygon.technology/"],
                nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
                blockExplorerUrls: ["https://www.oklink.com/amoy"],
              },
            ],
          });
        } catch (addError) {
          console.error("Không thể thêm mạng Polygon Amoy:", addError);
        }
      }
      console.error("Không thể chuyển mạng:", switchError);
    }
  };

  // Hàm kết nối ví MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Vui lòng cài đặt MetaMask!");
    try {
      await checkAndSwitchNetwork();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const connectedAddress = accounts[0];
      setWalletAddress(connectedAddress);
      setStatus("Đã kết nối ví. Đang kiểm tra quyền...");

      // Kiểm tra xem địa chỉ kết nối có phải là chủ sở hữu contract không
      const readOnlyProvider = new ethers.BrowserProvider(window.ethereum);
      const contractReader = new ethers.Contract(contractAddress, CertificateABI.abi, readOnlyProvider);

      try {
        const ownerAddress = await contractReader.owner();
        const isUserOwner = connectedAddress.toLowerCase() === ownerAddress.toLowerCase();
        setIsOwner(isUserOwner);
        setStatus(isUserOwner ? "Đã kết nối với quyền Admin." : "Đã kết nối với quyền Trường Đại Học.");
      } catch (ownerError) {
        console.error("Lỗi khi lấy địa chỉ Owner:", ownerError);
        setIsOwner(false);
        setStatus("Đã kết nối ví. Không thể xác định quyền.");
      }

    } catch (err) {
      console.error("Lỗi kết nối ví:", err);
      setIsOwner(false);
      setStatus("Kết nối ví thất bại.");
    }
  };

  // Hàm cấp phát chứng chỉ 
  const issueCertificate = async () => {
    if (!newCertStudentAddress || !newCertName || !newCertDescription || !newCertImage) {
      return alert("Vui lòng nhập đầy đủ thông tin và chọn ảnh chứng chỉ.");
    }
    if (!ethers.isAddress(newCertStudentAddress)) {
      return alert("Địa chỉ ví không hợp lệ. Vui lòng kiểm tra lại.");
    }
    setStatus("Đang khởi tạo giao dịch..."); 

    try {
      const safeStudentAddress = newCertStudentAddress.substring(0, 8);
      const timestamp = Date.now();
      const uniqueImageName = `cert_${safeStudentAddress}_${timestamp}.jpg`;
      const uniqueMetadataName = `meta_${safeStudentAddress}_${timestamp}.json`;

      // Tải ảnh lên Pinata
      setStatus("Bước 1/4: Đang tải ảnh lên IPFS...");
      const formData = new FormData();
      formData.append("file", newCertImage, uniqueImageName);
      const imgRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_API_SECRET,
        },
        body: formData,
      });
      const imgData = await imgRes.json();
      if (imgData.error) throw new Error(imgData.error.details || "Lỗi tải ảnh");
      const imageUrl = `ipfs://${imgData.IpfsHash}`;

      // Khởi tạo Metadata JSON
      setStatus("Bước 2/4: Đang tạo metadata...");
      const metadata = {
        name: newCertName,
        description: newCertDescription,
        image: imageUrl,
        attributes: [
          { trait_type: "Địa chỉ ví Trường Đại Học", value: newCertStudentAddress },
          { trait_type: "MSSV", value: newCertStudentId },
          { trait_type: "Tên sinh viên", value: newCertStudentName },
          { trait_type: "Lớp", value: newCertStudentClass },
          { trait_type: "Tên chứng chỉ", value: newCertName },
          { trait_type: "Ngày cấp", value: new Date().toLocaleDateString() },
        ]
      };

      // Tải Metadata JSON lên Pinata
      setStatus("Bước 3/4: Đang tải metadata lên IPFS...");
      const jsonRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_API_SECRET,
        },
        body: JSON.stringify({
          pinataMetadata: { name: uniqueMetadataName },
          pinataContent: metadata
        }),
      });
      const jsonData = await jsonRes.json();
      if (jsonData.error) throw new Error(jsonData.error.details || "Lỗi tải metadata");
      const tokenURI = `ipfs://${jsonData.IpfsHash}`;

      // Gọi hàm cấp phát chứng chỉ trong Smart Contract
      setStatus("Bước 4/4: Vui lòng xác nhận giao dịch trên MetaMask...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CertificateABI.abi, signer);
      const tx = await contract.issueCertificate(newCertStudentAddress, tokenURI);
      await tx.wait();
      
      setStatus(`Cấp chứng chỉ thành công, mã giao dịch: ${tx.hash}`);

      setNewCertStudentAddress("");
      setNewCertStudentId("");
      setNewCertStudentName("");
      setNewCertStudentClass("");
      setNewCertName("");
      setNewCertDescription("");
      setNewCertImage(null);

      const fileInput = document.getElementById("file-upload");
      if(fileInput) fileInput.value = "";

    } catch (err) {
      console.error("Lỗi khi cấp chứng chỉ:", err);
      setStatus(`Cấp chứng chỉ thất bại: ${err.message}`);
    }
  };

  // Hàm lấy chứng chỉ và thống kế
  const getMyCertificates = async () => {
    if (!walletAddress) return alert("Vui lòng kết nối ví trước.");
    setIsLoading(true);
    setStatus("Đang tải dữ liệu chứng chỉ.");
    setMyCertificates([]);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, CertificateABI.abi, provider);

      // Lấy tổng số lượng chứng chỉ mà ví này sở hữu
      const balance = await contract.balanceOf(walletAddress);
      const count = Number(balance);

      const contractOwner = await contract.owner();

      if (count === 0 && walletAddress.toLowerCase() !== contractOwner.toLowerCase()) {
        setStatus("Bạn chưa có chứng chỉ nào.");
        setIsLoading(false); 
        return;
      }

      // Tải dữ liệu song song tối ưu tốc độ
      const indices = Array.from({ length: count }, (_, i) => i);

      const certPromises = indices.map(async (i) => {
        try {
          // Lấy Token ID từ Blockchain
          const tokenId = await contract.tokenOfOwnerByIndex(walletAddress, i);

          // Lấy Token URI (Link chứa metadata)
          const tokenURI = await contract.tokenURI(tokenId);

          // Xử lý lấy link hình ảnh từ IPFS
          const gateway = "https://dweb.link/ipfs/";
          const metadataUrl = tokenURI.replace("ipfs://", gateway);

          // Tải dữ liệu JSON từ IPFS
          const response = await fetch(metadataUrl);
          const metadata = await response.json();

          // Trả về dữ liệu đầy đủ kèm TokenID
          return { ...metadata, tokenId: tokenId.toString() };
        } catch (error) {
          console.error(`Lỗi khi tải chứng chỉ thứ ${i}:`, error);
          return null; 
        }
      });

      const results = await Promise.all(certPromises);
      const validCerts = results.filter(cert => cert !== null);
      setMyCertificates(validCerts);
      setStatus("Đã tải chứng chỉ thành công");

    } catch (err) {
      console.error("Lỗi hệ thống:", err);
      setStatus("Tải chứng chỉ thất bại. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm tính toán dữ liệu cho biểu đồ
  const getChartData = () => {
    if (myCertificates.length === 0) return null;

    // Thống kê theo lớp (biểu đồ tròn)
    const classCounts = {};
    myCertificates.forEach(cert => {
      const classAttr = cert.attributes?.find(a => a.trait_type === "Lớp");
      const className = classAttr ? classAttr.value : "Khác";
      classCounts[className] = (classCounts[className] || 0) + 1;
    });

    const pieData = {
      labels: Object.keys(classCounts),
      datasets: [
        {
          label: 'Số lượng chứng chỉ',
          data: Object.values(classCounts),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)', 
            'rgba(54, 162, 235, 0.6)', 
            'rgba(255, 206, 86, 0.6)', 
            'rgba(75, 192, 192, 0.6)', 
            'rgba(153, 102, 255, 0.6)', 
            'rgba(255, 159, 64, 0.6)', 
          ],
          borderWidth: 1,
        },
      ],
    };

    // Thống kê theo tên chứng chỉ (biểu đồ cột)
    const certNameCounts = {};
    myCertificates.forEach(cert => {
      const name = cert.name || "Không tên";
      certNameCounts[name] = (certNameCounts[name] || 0) + 1;
    });

    const shortLabels = Object.keys(certNameCounts).map(name =>
      name.length > 15 ? name.substring(0, 15) + '...' : name
    );

    const barData = {
      labels: shortLabels,
      datasets: [
        {
          label: 'Số lượng',
          data: Object.values(certNameCounts),
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          borderRadius: 4,
        },
      ],
    };

    return { pieData, barData };
  };

  const chartData = getChartData();

  // Lắng nghe các sự kiện thay đổi tài khoản hoặc mạng
  useEffect(() => {
    if (walletAddress && !isOwner) {
      getMyCertificates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, isOwner]);


  // Giao diện người dùng
  return (
    <div className="App">
      {/* Khu vực hiển thị thông tin về đồ án tốt nghiệp */}
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
        />

        <h2>Hệ thống cấp phát chứng chỉ số BDU</h2>
        <button onClick={connectWallet} className="btn-primary" style={{ display: 'block', margin: '0 auto 20px auto' }}>
          {walletAddress ? `Đã kết nối: ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}` : "Kết nối ví MetaMask"}
        </button>

        {/* Khu vực cấp phát chứng chỉ dành cho Admin */}
        {isOwner && (
          <div>
            <h3>Thông tin chứng chỉ</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}> 
              <input type="text" placeholder="Đơn địa chỉ ví Trường Đại Học" value={newCertStudentAddress} onChange={(e) => setNewCertStudentAddress(e.target.value)} />
              <input type="text" placeholder="MSSV" value={newCertStudentId} onChange={(e) => setNewCertStudentId(e.target.value)} />
              <input type="text" placeholder="Họ tên sinh viên" value={newCertStudentName} onChange={(e) => setNewCertStudentName(e.target.value)} />
              <input type="text" placeholder="Lớp" value={newCertStudentClass} onChange={(e) => setNewCertStudentClass(e.target.value)} />
              <input type="text" placeholder="Tên chứng chỉ" value={newCertName} onChange={(e) => setNewCertName(e.target.value)} />
              <textarea placeholder="Mô tả chứng chỉ" value={newCertDescription} onChange={(e) => setNewCertDescription(e.target.value)} />

              <input
                id="file-upload"
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={(e) => setNewCertImage(e.target.files[0])}
              />

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label htmlFor="file-upload" className="custom-file-upload">
                  Tải ảnh chứng chỉ
                </label>

                <span className="file-name-display">
                  {newCertImage ? `Đã chọn ảnh ${newCertImage.name}` : "Chưa chọn tệp nào"}
                </span>
              </div>

              <button onClick={issueCertificate} className="btn-primary" style={{ width: '100%', marginTop: '15px' }}>
                Cấp chứng chỉ
              </button>
              {status && (
                <p style={{ 
                    marginTop: '15px', 
                    padding: '10px', 
                    backgroundColor: '#e9ecef', 
                    borderRadius: '5px', 
                    color: status.includes('thất bại') ? 'red' : (status.includes('thành công') ? 'green' : '#0056b3'),
                    fontWeight: 'bold',
                    textAlign: 'center'
                }}>
                  {status}
                </p>
              )}
            </div>
            <hr />
          </div>
        )}

        {/* Khu vực thống kê và tra cứu chứng chỉ dành cho Trường Đại Học */}
        {!isOwner && walletAddress && (
          <div>
            <h3 style={{ textAlign: 'center' }}>Thống kê tra cứu chứng chỉ</h3>

            {isLoading ? (
              <div style={{ textAlign: 'center', margin: '50px 0', color: '#007bff' }}>
                <h4>Đang tải chứng chỉ</h4>
              </div>
            ) :
              myCertificates.length > 0 ? (
                <div className="stats-container">

                  <div className="stat-card">
                    <h3>Tổng số chứng chỉ</h3>
                    <div style={{ textAlign: 'center' }}>
                      <span className="total-number">{myCertificates.length}</span>
                      <div className="total-label">Chứng chỉ</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <h3>Tỷ lệ theo Lớp</h3>
                    <div className="chart-container">
                      {chartData && <Pie
                        data={chartData.pieData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false, 
                          plugins: { legend: { position: 'bottom' } }
                        }}
                      />}
                    </div>
                  </div>

                  <div className="stat-card">
                    <h3>Thống kê loại chứng chỉ</h3>
                    <div className="chart-container">
                      {chartData && <Bar
                        data={chartData.barData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } }, 
                          scales: {
                            y: { beginAtZero: true, ticks: { stepSize: 1 } } 
                          }
                        }}
                      />}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', margin: '40px 0', color: '#666' }}>
                  <p>Hiện tại bạn chưa có chứng chỉ nào</p>
                </div>
              )}

            <input
              type="text"
              placeholder="Tìm kiếm theo tên chứng chỉ..."
              style={{
                padding: '12px', 
                marginTop: '20px',
                marginBottom: '10px',
                width: 'calc(100% - 26px)', 
                border: '1px solid #ced4da',
                borderRadius: '6px',
                fontSize: '16px'
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="certificate-list">
              {myCertificates
                .filter(cert => {
                  const lowerCaseSearchTerm = searchTerm.toLowerCase();
                  if (lowerCaseSearchTerm === "") {
                    return true;
                  }
                  const certName = cert.name ? cert.name.toLowerCase() : "";
                  if (certName.includes(lowerCaseSearchTerm)) {
                    return true;
                  }

                  // Kiểm tra các thuộc tính từ Metadata
                  if (Array.isArray(cert.attributes)) {
                    const mssvAttribute = cert.attributes.find(attr => attr.trait_type === "MSSV");
                    const mssv = mssvAttribute ? mssvAttribute.value.toLowerCase() : "";
                    if (mssv.includes(lowerCaseSearchTerm)) {
                      return true;
                    }

                    const hoTenAttribute = cert.attributes.find(attr => attr.trait_type === "Tên sinh viên");
                    const hoTen = hoTenAttribute ? hoTenAttribute.value.toLowerCase() : "";
                    if (hoTen.includes(lowerCaseSearchTerm)) {
                      return true;
                    }
                  }

                  return false;
                })
                .map((cert, index) => (
                  <CertificateCard key={index} metadata={cert} />
                ))}
            </div>
          </div>
        )}

        {status && !isLoading && !isOwner && (
          <p className="status-message">{status}</p>
        )}
      </div>
    </div>
  );
}

export default App;
