import React from 'react'
import DashboardSummary from './DashboardSummary'
import DashboardSummaryCount from './DashboardSummaryCount'
import Problemseverity from './Problemseverity'
import { Margarine } from 'next/font/google'


const Dashboard = () => {

  return (
    <div>
      <DashboardSummaryCount />
      <DashboardSummary />
      <Problemseverity  />
      
    </div>
  )
}

export default Dashboard