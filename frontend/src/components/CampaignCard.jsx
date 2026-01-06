import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, GraduationCap, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { verificationStatuses } from '../mockData';

const CampaignCard = ({ student }) => {
  const progress = (student.raisedAmount / student.targetAmount) * 100;
  const remaining = student.targetAmount - student.raisedAmount;
  const status = verificationStatuses[student.verificationStatus];

  return (
    <Link to={`/campaign/${student.id}`}>
      <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden group">
        <div className="relative">
          <img
            src={student.picture}
            alt={student.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 right-3">
            <Badge className={`${status.color} border`}>
              {student.verificationStatus === 'verified' ? (
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
              <h3 className="font-bold text-lg text-gray-900 mb-1">{student.name}</h3>
              <div className="flex items-center text-sm text-gray-600 space-x-3">
                <span className="flex items-center">
                  <GraduationCap className="h-4 w-4 mr-1" />
                  {student.fieldOfStudy}
                </span>
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {student.country}
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{student.story}</p>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-gray-900">
                  ${student.raisedAmount.toLocaleString()} raised
                </span>
                <span className="text-gray-600">
                  ${student.targetAmount.toLocaleString()} goal
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{student.donors?.length || 0} donors</span>
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
