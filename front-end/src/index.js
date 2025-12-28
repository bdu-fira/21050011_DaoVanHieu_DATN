import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import App from './App'; // Trang quản lý (cũ của bạn)
import VerificationPage from './VerificationPage'; // Trang viewer (mới)
import './index.css'; // File CSS chung

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Khi người dùng vào "/", sẽ hiển thị ứng dụng quản lý (của bạn)
        */}
        <Route path="/" element={<App />} />

        {/* Khi người dùng vào "/verify/1" (hoặc /verify/2, 3...)
          sẽ hiển thị trang xác thực (viewer)
        */}
        <Route path="/verify/:tokenId" element={<VerificationPage />} />

      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);