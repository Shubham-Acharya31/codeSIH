from typing import Optional

class FreightAppException(Exception):
    """Base exception for freight consolidation application."""
    status_code: int = 500
    message: str = "An unexpected error occurred in the freight engine."

    def __init__(self, message: Optional[str] = None, detail: Optional[str] = None, status_code: Optional[int] = None):
        if message:
            self.message = message
        self.detail = detail or self.message
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.detail)

class ShipmentNotFoundError(FreightAppException):
    status_code = 404
    message = "Shipment record not found."

class InvalidShipmentPayloadError(FreightAppException):
    status_code = 400
    message = "Invalid shipment payload provided."

class RoutingProviderUnavailableError(FreightAppException):
    status_code = 502
    message = "Upstream road routing provider is unavailable."

class RailLegNotFoundError(FreightAppException):
    status_code = 404
    message = "No valid rail corridor exists between the requested origins and destinations."

class OptimizationInfeasibleError(FreightAppException):
    status_code = 422
    message = "The solver was unable to find a feasible consolidation plan under given constraints."
