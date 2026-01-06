import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, GraduationCap, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { verificationStatuses } from '../services/api';

const CampaignCard = ({ campaign }) => {
  const progress = campaign.target_amount > 0 
    ? (campaign.raised_amount / campaign.target_amount) * 100 
    : 0;
  const student = campaign.student || {};
  const verificationStatus = student.verification_status || 'pending';
  const status = verificationStatuses[verificationStatus] || verificationStatuses.pending;

  return (
    <Link to={`/campaign/${campaign.campaign_id}`}>
      <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden group">
        <div className="relative">
          <img
            src={student.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400'}
            alt={student.name || 'Student'}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 right-3">
            <Badge className={`${status.color} border`}>
              {verificationStatus === 'verified' ? (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              ) : (
                <Clock className="h-3 w-3 mr-1" />
              )}
              {status.label}
            </Badge>
          </div>
        </div>

        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">{campaign.title}</h3>
              <p className="text-sm text-gray-700 font-medium mb-1">{student.name || 'Student'}</p>
              <div className="flex items-center text-sm text-gray-600 space-x-3">
                {student.field_of_study && (
                  <span className="flex items-center">
                    <GraduationCap className="h-4 w-4 mr-1" />
                    {student.field_of_study}
                  </span>
                )}
                {student.country && (
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {student.country}
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{campaign.story}</p>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-gray-900">
                  ${(campaign.raised_amount || 0).toLocaleString()} raised
                </span>
                <span className="text-gray-600">
                  ${(campaign.target_amount || 0).toLocaleString()} goal
                </span>
              </div>
              <Progress value={Math.min(progress, 100)} className="h-2" />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{campaign.donor_count || 0} donors</span>
              <span className="flex items-center text-blue-600 font-medium">
                <TrendingUp className="h-4 w-4 mr-1" />
                {progress.toFixed(0)}% funded
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CampaignCard;
