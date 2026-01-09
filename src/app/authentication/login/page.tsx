"use client";

import React from "react";
import Link from "next/link";
import { Box, Card, Stack, Typography, Container } from "@mui/material";

import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import AuthLogin from "../auth/AuthLogin";

const Login2 = () => {
  const [userData, setUserData] = React.useState({
    userName: "",
    password: "",
  });

  return (
    <PageContainer title="Login" description="Login page">
      <Box
        sx={{
          minHeight: "100dvh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflowX: "hidden",
          position: "relative",
          backgroundColor: "#0f172a",
        }}
      >
        {/* ✅ Blurred SVG Background Layer */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            
            backgroundImage: {
              xs: "none",
              sm: "none",
              md: `url("data:image/svg+xml,%3Csvg viewBox='0 0 1200 600' xmlns='http://www.w3.org/2000/svg'%3E%3Cstyle%3E@keyframes slideIn %7Bfrom %7B transform: scaleX(0); opacity: 0%7D to %7B transform: scaleX(1); opacity: 1%7D%7D @keyframes scaleIn %7Bfrom %7B transform: scale(0); opacity: 0%7D to %7B transform: scale(1); opacity: 1%7D%7D @keyframes slideLeft %7Bfrom %7B transform: translateX(-50px); opacity: 0%7D to %7B transform: translateX(0); opacity: 1%7D%7D @keyframes slideRight %7Bfrom %7B transform: translateX(50px); opacity: 0%7D to %7B transform: translateX(0); opacity: 1%7D%7D @keyframes slideUp %7Bfrom %7B transform: translateY(30px); opacity: 0%7D to %7B transform: translateY(0); opacity: 1%7D%7D @keyframes blink %7B0%25, 100%25 %7B opacity: 0.3%7D 50%25 %7B opacity: 1%7D%7D @keyframes pulse %7B0%25, 100%25 %7B opacity: 0.4%7D 50%25 %7B opacity: 0.7%7D%7D @keyframes scan %7B0%25, 100%25 %7B transform: translateY(-200px); opacity: 0%7D 10%25 %7B opacity: 0.7%7D 90%25 %7B opacity: 0.7%7D%7D @keyframes glow %7B0%25, 100%25 %7B opacity: 0.08%7D 50%25 %7B opacity: 0.18%7D%7D @keyframes breathe %7B0%25, 100%25 %7B opacity: 0.15%7D 50%25 %7B opacity: 0.25%7D%7D @keyframes float %7B0%25, 100%25 %7B transform: translateY(0); opacity: 0%7D 10%25 %7B opacity: 0.6%7D 90%25 %7B opacity: 0.6%7D%7D @keyframes connectPulse %7B0%25, 100%25 %7B stroke-dashoffset: 200%7D 50%25 %7B stroke-dashoffset: 0%7D%7D .wall %7B animation: slideIn 0.8s 0.5s ease-out forwards; animation-fill-mode: both%7D .main-screen %7B animation: scaleIn 0.6s 1s ease-out forwards; animation-fill-mode: both%7D .top-left-0 %7B animation: slideLeft 0.6s 1.2s ease-out forwards; animation-fill-mode: both%7D .top-left-1 %7B animation: slideLeft 0.6s 1.4s ease-out forwards; animation-fill-mode: both%7D .top-right-0 %7B animation: slideRight 0.6s 1.2s ease-out forwards; animation-fill-mode: both%7D .top-right-1 %7B animation: slideRight 0.6s 1.4s ease-out forwards; animation-fill-mode: both%7D .bottom-monitor-0 %7B animation: slideUp 0.5s 1.5s ease-out forwards; animation-fill-mode: both%7D .bottom-monitor-1 %7B animation: slideUp 0.5s 1.65s ease-out forwards; animation-fill-mode: both%7D .bottom-monitor-2 %7B animation: slideUp 0.5s 1.8s ease-out forwards; animation-fill-mode: both%7D .bottom-monitor-3 %7B animation: slideUp 0.5s 1.95s ease-out forwards; animation-fill-mode: both%7D .desk %7B animation: slideUp 0.6s 1.8s ease-out forwards; animation-fill-mode: both%7D .label %7B animation: slideUp 0.8s 2.5s ease-out forwards; animation-fill-mode: both%7D .blink %7B animation: blink 1.5s infinite%7D .pulse %7B animation: pulse 2s infinite%7D .scan %7B animation: scan 4s 2.5s linear infinite%7D .glow %7B animation: glow 2.5s 2s ease-in-out infinite%7D .breathe %7B animation: breathe 3s 1.5s ease-in-out infinite%7D .float %7B animation: float 3s 3s infinite%7D .connect-line %7B animation: connectPulse 3s 2.5s ease-in-out infinite%7D%3C/style%3E%3Cdefs%3E%3ClinearGradient id='techGrad' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' stop-color='%2360a5fa' /%3E%3Cstop offset='50%25' stop-color='%2338bdf8' /%3E%3Cstop offset='100%25' stop-color='%2322c55e' /%3E%3C/linearGradient%3E%3ClinearGradient id='screenGlow' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%233b82f6' stop-opacity='0.6' /%3E%3Cstop offset='100%25' stop-color='%231d4ed8' stop-opacity='0.2' /%3E%3C/linearGradient%3E%3Cfilter id='glow'%3E%3CfeGaussianBlur stdDeviation='4' result='coloredBlur'/%3E%3CfeMerge%3E%3CfeMergeNode in='coloredBlur'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3Cfilter id='softGlow'%3E%3CfeGaussianBlur stdDeviation='2' result='coloredBlur'/%3E%3CfeMerge%3E%3CfeMergeNode in='coloredBlur'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3Cfilter id='redGlow'%3E%3CfeGaussianBlur stdDeviation='3' result='coloredBlur'/%3E%3CfeMerge%3E%3CfeMergeNode in='coloredBlur'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3Cpattern id='scrollGrid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M40 0H0V40' fill='none' stroke='%233b82f6' stroke-opacity='0.1'/%3E%3C/pattern%3E%3C/defs%3E%3CradialGradient id='bgGrad'%3E%3Cstop offset='0%25' stop-color='%231e3a5f'/%3E%3Cstop offset='100%25' stop-color='%230f172a'/%3E%3C/radialGradient%3E%3Crect width='1200' height='600' fill='url(%23bgGrad)'/%3E%3Crect x='60' y='40' width='1080' height='250' rx='18' fill='%230a1628' stroke='%233b82f6' stroke-width='3' class='wall'/%3E%3Cg class='top-left-0' opacity='0'%3E%3Crect x='80' y='60' width='140' height='90' rx='8' fill='%231a2332' stroke='%233b82f6' stroke-width='2.5'/%3E%3Ccircle cx='95' cy='72' r='4' fill='%23ef4444' filter='url(%23redGlow)'/%3E%3Ccircle cx='107' cy='72' r='4' fill='%23ef4444' filter='url(%23redGlow)'/%3E%3Ccircle cx='119' cy='72' r='4' fill='%23ef4444' filter='url(%23redGlow)' class='blink'/%3E%3Crect x='100' y='115' width='10' height='25' fill='%2338bdf8' rx='2'/%3E%3Crect x='115' y='105' width='10' height='35' fill='%2338bdf8' rx='2'/%3E%3Crect x='130' y='120' width='10' height='20' fill='%2338bdf8' rx='2'/%3E%3Crect x='145' y='110' width='10' height='30' fill='%2338bdf8' rx='2'/%3E%3C/g%3E%3Cg class='top-left-1' opacity='0'%3E%3Crect x='80' y='165' width='140' height='90' rx='8' fill='%231a2332' stroke='%233b82f6' stroke-width='2.5'/%3E%3Ccircle cx='95' cy='177' r='4' fill='%23ef4444' filter='url(%23redGlow)' class='blink'/%3E%3Ccircle cx='107' cy='177' r='4' fill='%23ef4444' filter='url(%23redGlow)'/%3E%3Ccircle cx='119' cy='177' r='4' fill='%23ef4444' filter='url(%23redGlow)' class='blink' style='animation-delay: 0.3s'/%3E%3Cpath d='M90 210 L105 200 L120 215 L135 195 L150 205 L165 200 L180 210 L195 205' fill='none' stroke='%2322c55e' stroke-width='2.5'/%3E%3C/g%3E%3Crect x='240' y='60' width='720' height='190' rx='12' fill='%230f1729' stroke='%233b82f6' stroke-width='3' class='main-screen'/%3E%3Ctext x='600' y='165' font-family='Arial, sans-serif' font-size='75' font-weight='bold' fill='%231e40af' text-anchor='middle' letter-spacing='6' opacity='0.2' class='breathe'%3ETECHSEC%3C/text%3E%3Crect x='240' y='60' width='720' height='190' rx='12' fill='url(%23scrollGrid)' opacity='0.3'/%3E%3Cline x1='245' y1='250' x2='955' y2='250' stroke='%2360a5fa' stroke-width='2' opacity='0.7' filter='url(%23glow)' class='scan'/%3E%3Crect x='240' y='60' width='720' height='190' rx='12' fill='url(%23screenGlow)' opacity='0.1' class='glow'/%3E%3Cg class='top-right-0' opacity='0'%3E%3Crect x='980' y='60' width='140' height='90' rx='8' fill='%231a2332' stroke='%233b82f6' stroke-width='2.5'/%3E%3Ccircle cx='995' cy='72' r='4' fill='%23ef4444' filter='url(%23redGlow)' class='blink' style='animation-delay: 0.2s'/%3E%3Ccircle cx='1007' cy='72' r='4' fill='%23ef4444' filter='url(%23redGlow)'/%3E%3Ccircle cx='1019' cy='72' r='4' fill='%23ef4444' filter='url(%23redGlow)' class='blink' style='animation-delay: 0.5s'/%3E%3Ccircle cx='1015' cy='105' r='5' fill='%2360a5fa'/%3E%3Ccircle cx='1035' cy='95' r='5' fill='%2360a5fa'/%3E%3Ccircle cx='1055' cy='105' r='5' fill='%2360a5fa'/%3E%3Ccircle cx='1035' cy='115' r='5' fill='%2360a5fa'/%3E%3Cline x1='1015' y1='105' x2='1035' y2='95' stroke='%2360a5fa' stroke-width='2'/%3E%3Cline x1='1035' y1='95' x2='1055' y2='105' stroke='%2360a5fa' stroke-width='2'/%3E%3Cline x1='1015' y1='105' x2='1035' y2='115' stroke='%2360a5fa' stroke-width='2'/%3E%3Cline x1='1055' y1='105' x2='1035' y2='115' stroke='%2360a5fa' stroke-width='2'/%3E%3C/g%3E%3Cg class='top-right-1' opacity='0'%3E%3Crect x='980' y='165' width='140' height='90' rx='8' fill='%231a2332' stroke='%233b82f6' stroke-width='2.5'/%3E%3Ccircle cx='995' cy='177' r='4' fill='%23ef4444' filter='url(%23redGlow)' class='blink' style='animation-delay: 0.4s'/%3E%3Ccircle cx='1007' cy='177' r='4' fill='%23ef4444' filter='url(%23redGlow)' class='blink' style='animation-delay: 0.1s'/%3E%3Ccircle cx='1019' cy='177' r='4' fill='%23ef4444' filter='url(%23redGlow)'/%3E%3Cpath d='M1050 195 L1050 215 Q1050 225 1062 228 Q1074 225 1074 215 L1074 195 Z' fill='%2322c55e' opacity='0.3' stroke='%2322c55e' stroke-width='2'/%3E%3Cpath d='M1056 208 L1060 215 L1068 202' fill='none' stroke='%2322c55e' stroke-width='2.5' stroke-linecap='round'/%3E%3C/g%3E%3Cline x1='350' y1='250' x2='200' y2='310' stroke='%233b82f6' stroke-width='2' opacity='0.5' stroke-dasharray='5,5' class='connect-line'/%3E%3Cline x1='500' y1='250' x2='450' y2='310' stroke='%233b82f6' stroke-width='2' opacity='0.5' stroke-dasharray='5,5' class='connect-line' style='animation-delay: 0.3s'/%3E%3Cline x1='700' y1='250' x2='700' y2='310' stroke='%233b82f6' stroke-width='2' opacity='0.5' stroke-dasharray='5,5' class='connect-line' style='animation-delay: 0.6s'/%3E%3Cline x1='850' y1='250' x2='950' y2='310' stroke='%233b82f6' stroke-width='2' opacity='0.5' stroke-dasharray='5,5' class='connect-line' style='animation-delay: 0.9s'/%3E%3Cg class='bottom-monitor-0' opacity='0'%3E%3Crect x='100' y='310' width='200' height='75' rx='10' fill='%231a2332' stroke='%233b82f6' stroke-width='2.5'/%3E%3Cg transform='translate(145, 340)'%3E%3Cellipse cx='0' cy='0' rx='22' ry='7' fill='%232563eb' opacity='0.4'/%3E%3Crect x='-22' y='0' width='44' height='16' fill='%232563eb' opacity='0.4'/%3E%3Cellipse cx='0' cy='16' rx='22' ry='7' fill='%232563eb' opacity='0.6'/%3E%3Cpath d='M-22 0 Q-22 7 0 7 T22 0' fill='none' stroke='%2360a5fa' stroke-width='2'/%3E%3Cpath d='M-22 8 Q-22 15 0 15 T22 8' fill='none' stroke='%2360a5fa' stroke-width='2'/%3E%3Cpath d='M-22 16 Q-22 23 0 23 T22 16' fill='none' stroke='%2360a5fa' stroke-width='2'/%3E%3C/g%3E%3Ctext x='200' y='345' font-size='12' fill='%2360a5fa' font-weight='600'%3EDATABASE%3C/text%3E%3Ccircle cx='115' cy='323' r='3.5' fill='%23ef4444' filter='url(%23redGlow)' class='blink'/%3E%3Ccircle cx='128' cy='323' r='3.5' fill='%23ef4444' filter='url(%23redGlow)' class='blink' style='animation-delay: 0.2s'/%3E%3Ccircle cx='120' cy='375' r='3' fill='%2322c55e' class='pulse'/%3E%3Ccircle cx='135' cy='375' r='3' fill='%2322c55e' class='pulse' style='animation-delay: 0.2s'/%3E%3Ccircle cx='150' cy='375' r='3' fill='%2322c55e' class='pulse' style='animation-delay: 0.4s'/%3E%3C/g%3E%3Cg class='bottom-monitor-1' opacity='0'%3E%3Crect x='350' y='310' width='200' height='75' rx='10' fill='%231a2332' stroke='%233b82f6' stroke-width='2.5'/%3E%3Cg transform='translate(395, 340)'%3E%3Crect x='-25' y='0' width='50' height='11' rx='2' fill='%231e40af' stroke='%2360a5fa' stroke-width='2'/%3E%3Ccircle cx='-16' cy='5.5' r='2' fill='%2322c55e'/%3E%3Ccircle cx='-8' cy='5.5' r='2' fill='%2322c55e'/%3E%3Crect x='-25' y='14' width='50' height='11' rx='2' fill='%231e40af' stroke='%2360a5fa' stroke-width='2'/%3E%3Ccircle cx='-16' cy='19.5' r='2' fill='%23fbbf24'/%3E%3Ccircle cx='-8' cy='19.5' r='2' fill='%2322c55e'/%3E%3Cline x1='0' y1='3' x2='18' y2='3' stroke='%2360a5fa' stroke-width='1'/%3E%3Cline x1='0' y1='8' x2='18' y2='8' stroke='%2360a5fa' stroke-width='1'/%3E%3Cline x1='0' y1='17' x2='18' y2='17' stroke='%2360a5fa' stroke-width='1'/%3E%3Cline x1='0' y1='22' x2='18' y2='22' stroke='%2360a5fa' stroke-width='1'/%3E%3C/g%3E%3Ctext x='455' y='345' font-size='12' fill='%2360a5fa' font-weight='600'%3ESERVER%3C/text%3E%3Ccircle cx='365' cy='323' r='3.5' fill='%23ef4444' filter='url(%23redGlow)' class='blink' style='animation-delay: 0.3s'/%3E%3Ccircle cx='378' cy='323' r='3.5' fill='%23ef4444' filter='url(%23redGlow)' class='blink' style='animation-delay: 0.5s'/%3E%3Ccircle cx='370' cy='375' r='3' fill='%2322c55e' class='pulse' style='animation-delay: 0.1s'/%3E%3Ccircle cx='385' cy='375' r='3' fill='%2322c55e' class='pulse' style='animation-delay: 0.3s'/%3E%3Ccircle cx='400' cy='375' r='3' fill='%2322c55e' class='pulse' style='animation-delay: 0.5s'/%3E%3C/g%3E%3Cg class='bottom-monitor-2' opacity='0'%3E%3Crect x='600' y='310' width='200' height='75' rx='10' fill='%231a2332' stroke='%233b82f6' stroke-width='2.5'/%3E%3Cg transform='translate(645, 345)'%3E%3Ccircle cx='-10' cy='-3' r='7' fill='%233b82f6' opacity='0.6'/%3E%3Cpath d='M-17 5 Q-17 -1 -10 1 Q-3 -1 -3 5 L-5 15 L-15 15 Z' fill='%233b82f6' opacity='0.6'/%3E%3Ccircle cx='10' cy='-3' r='7' fill='%2360a5fa' opacity='0.8'/%3E%3Cpath d='M3 5 Q3 -1 10 1 Q17 -1 17 5 L15 15 L5 15 Z' fill='%2360a5fa' opacity='0.8'/%3E%3C/g%3E%3Ctext x='715' y='345' font-size='12' fill='%2360a5fa' font-weight='600'%3EUSERS%3C/text%3E%3Ccircle cx='615' cy='323' r='3.5' fill='%23ef4444' filter='url(%23redGlow)' class='blink' style='animation-delay: 0.4s'/%3E%3Ccircle cx='628' cy='323' r='3.5' fill='%23ef4444' filter='url(%23redGlow)' class='blink' style='animation-delay: 0.6s'/%3E%3Ccircle cx='620' cy='375' r='3' fill='%2322c55e' class='pulse' style='animation-delay: 0.2s'/%3E%3Ccircle cx='635' cy='375' r='3' fill='%2322c55e' class='pulse' style='animation-delay: 0.4s'/%3E%3Ccircle cx='650' cy='375' r='3' fill='%2322c55e' class='pulse' style='animation-delay: 0.6s'/%3E%3C/g%3E%3Cg class='bottom-monitor-3' opacity='0'%3E%3Crect x='850' y='310' width='200' height='75' rx='10' fill='%231a2332' stroke='%233b82f6' stroke-width='2.5'/%3E%3Cg transform='translate(895, 345)'%3E%3Cpath d='M0 -8 L8 8 L-8 8 Z' fill='%23fbbf24' opacity='0.3' stroke='%23fbbf24' stroke-width='2'/%3E%3Ctext x='0' y='6' font-size='12' fill='%23fbbf24' text-anchor='middle' font-weight='bold'%3E!%3C/text%3E%3C/g%3E%3Ctext x='960' y='345' font-size='12' fill='%23fbbf24' font-weight='600'%3ETHREATS%3C/text%3E%3Ccircle cx='865' cy='323' r='3.5' fill='%23ef4444' filter='url(%23redGlow)' class='blink' style='animation-delay: 0.5s'/%3E%3Ccircle cx='878' cy='323' r='3.5' fill='%23ef4444' filter='url(%23redGlow)' class='blink' style='animation-delay: 0.7s'/%3E%3Ccircle cx='870' cy='375' r='3' fill='%23fbbf24' class='pulse' style='animation-delay: 0.3s'/%3E%3Ccircle cx='885' cy='375' r='3' fill='%23fbbf24' class='pulse' style='animation-delay: 0.5s'/%3E%3Ccircle cx='900' cy='375' r='3' fill='%23fbbf24' class='pulse' style='animation-delay: 0.7s'/%3E%3C/g%3E%3Crect x='200' y='430' width='800' height='65' rx='14' fill='%231e293b' stroke='%23334155' stroke-width='3' class='desk'/%3E%3Crect x='430' y='448' width='340' height='30' rx='6' fill='%230f172a' stroke='%23475569' stroke-width='2'/%3E%3Crect x='450' y='456' width='14' height='14' rx='2' fill='%23334155'/%3E%3Crect x='470' y='456' width='14' height='14' rx='2' fill='%23334155'/%3E%3Crect x='490' y='456' width='14' height='14' rx='2' fill='%23334155'/%3E%3Ctext x='600' y='565' font-family='Arial, sans-serif' font-size='22' font-weight='600' fill='%2360a5fa' text-anchor='middle' letter-spacing='10' class='label' opacity='0'%3ENETWORK MONITORING SYSTEM%3C/text%3E%3Ccircle cx='250' cy='150' r='1.5' fill='%2360a5fa' opacity='0' class='float'/%3E%3Ccircle cx='400' cy='100' r='1.5' fill='%2360a5fa' opacity='0' class='float' style='animation-delay: 0.4s'/%3E%3Ccircle cx='600' cy='180' r='1.5' fill='%2360a5fa' opacity='0' class='float' style='animation-delay: 0.8s'/%3E%3Ccircle cx='800' cy='120' r='1.5' fill='%2360a5fa' opacity='0' class='float' style='animation-delay: 1.2s'/%3E%3Ccircle cx='950' cy='160' r='1.5' fill='%2360a5fa' opacity='0' class='float' style='animation-delay: 1.6s'/%3E%3C/svg%3E")`,
            },
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            
            // ✅ Apply blur to the SVG background
            filter: "blur(2px)",
          }}
        />

        {/* ✅ Clear Content on Top */}
        <Container
          maxWidth="sm"
          sx={{
            display: "flex",
            justifyContent: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Card
            elevation={9}
            sx={{
              width: "100%",
              maxWidth: 460,
              p: { xs: 2.5, sm: 4 },
              backgroundColor: "rgba(15, 23, 42, 0.45)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(60, 130, 246, 0.3)",
              borderRadius: 3,
              // Make input fields more visible
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(30, 41, 59, 0.6)",
                "& fieldset": {
                  borderColor: "rgba(59, 130, 246, 0.5)",
                  borderWidth: "2px",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(59, 130, 246, 0.8)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#3b82f6",
                  borderWidth: "2px",
                },
              },
              "& .MuiInputBase-input": {
                color: "#e2e8f0",
                fontWeight: 600,
                fontSize: "1rem",
              },
              "& .MuiInputLabel-root": {
                color: "#94a3b8",
                fontWeight: 600,
                fontSize: "1rem",
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "#60a5fa",
                fontWeight: 600,
              },
            }}
          >
            <AuthLogin
              userData={userData}
              setUserData={setUserData}
              subtitle={
                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="center"
                  mt={3}
                  flexWrap="wrap"
                >
                </Stack>
              }
            />
          </Card>
        </Container>
      </Box>
    </PageContainer>
  );
};

export default Login2;