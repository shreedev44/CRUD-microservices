kubectl port-forward svc/frontend-service 5173:5173 &
kubectl port-forward svc/api-gateway-service 4040:4040

wait