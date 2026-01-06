import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Heart, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { getPaymentStatus, getCampaign } from '../services/api';

const DonateSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking, success, error
  const [campaign, setCampaign] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const campaignId = searchParams.get('campaign_id');

    if (!sessionId) {
      setStatus('error');
      return;
    }

    const checkPayment = async (attempts = 0) => {
      const maxAttempts = 10;
      const pollInterval = 2000;

      if (attempts >= maxAttempts) {
        setStatus('error');
        return;
      }

      try {
        const response = await getPaymentStatus(sessionId);
        
        if (response.data.payment_status === 'paid') {
          setPaymentData(response.data);
          setStatus('success');
          
          // Load campaign data
          if (campaignId) {
            try {
              const campaignRes = await getCampaign(campaignId);
              setCampaign(campaignRes.data);
            } catch (e) {
              console.error('Failed to load campaign:', e);
            }
          }
          return;
        } else if (response.data.status === 'expired' || response.data.payment_status === 'failed') {
          setStatus('error');
          return;
        }

        // Continue polling
        setTimeout(() => checkPayment(attempts + 1), pollInterval);
      } catch (error) {
        console.error('Error checking payment:', error);
        if (attempts >= maxAttempts - 1) {
          setStatus('error');
        } else {
          setTimeout(() => checkPayment(attempts + 1), pollInterval);
        }
      }
    };

    checkPayment();
  }, [searchParams]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h1>
            <p className="text-gray-600">Please wait while we confirm your donation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Issue</h1>
            <p className="text-gray-600 mb-6">
              We couldn&apos;t verify your payment. If you were charged, please contact support.
            </p>
            <Button onClick={() => navigate('/browse')} className="w-full">
              Back to Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-xl text-gray-600 mb-6">Your donation was successful</p>
          
          {paymentData && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Amount donated</p>
              <p className="text-3xl font-bold text-blue-600">${paymentData.amount}</p>
            </div>
          )}

          {campaign && (
            <div className="text-left bg-white border rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">You supported:</p>
              <div className="flex items-center space-x-3">
                {campaign.student?.picture && (
                  <img 
                    src={campaign.student.picture} 
                    alt={campaign.student.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold text-gray-900">{campaign.title}</p>
                  <p className="text-sm text-gray-600">{campaign.student?.name}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-gray-600">
              <Heart className="inline h-4 w-4 text-red-500 mr-1" />
              Your generosity helps students achieve their dreams
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {campaign && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/campaign/${campaign.campaign_id}`)}
                  className="flex-1"
                >
                  View Campaign
                </Button>
              )}
              <Button 
                onClick={() => navigate('/browse')}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Browse More
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DonateSuccess;
