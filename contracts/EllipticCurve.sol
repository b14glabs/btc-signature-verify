// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library EllipticCurve {
    uint256 public constant A = 0;
    uint256 public constant B = 7;
    uint256 public constant P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
    // Pre-computed constant for 2 ** 255
    uint256 private constant U255_MAX_PLUS_1 = 57896044618658097711785492504343953926634992332820282019728792003956564819968;

    /// @dev Modular exponentiation, b^e % _P.
    /// Source: https://github.com/androlo/standard-contracts/blob/master/contracts/src/crypto/ECCMath.sol
    /// @param _base base
    /// @param _exp exponent
    /// @param _P modulus
    /// @return r such that r = b**e (mod _P)
    function expMod(uint256 _base, uint256 _exp, uint256 _P) internal pure returns (uint256)
    {
        require(_P != 0, "EllipticCurve: modulus is zero");

        if (_base == 0) return 0;
        if (_exp == 0) return 1;

        uint256 r = 1;
        uint256 bit = U255_MAX_PLUS_1;
        assembly {
            for {

            } gt(bit, 0) {

            } {
                r := mulmod(
                mulmod(r, r, _P),
                exp(_base, iszero(iszero(and(_exp, bit)))),
                _P
                )
                r := mulmod(
                mulmod(r, r, _P),
                exp(_base, iszero(iszero(and(_exp, div(bit, 2))))),
                _P
                )
                r := mulmod(
                mulmod(r, r, _P),
                exp(_base, iszero(iszero(and(_exp, div(bit, 4))))),
                _P
                )
                r := mulmod(
                mulmod(r, r, _P),
                exp(_base, iszero(iszero(and(_exp, div(bit, 8))))),
                _P
                )
                bit := div(bit, 16)
            }
        }

        return r;
    }

    /// @dev Derives the y coordinate from a compressed-format point x [[SEC-1]](https://www.secg.org/SEC1-Ver-1.0.pdf).
    /// @param prefix parity byte (0x02 even, 0x03 odd)
    /// @param _x coordinate x
    /// @return y coordinate y
    function deriveY(uint8 prefix, uint256 _x) internal pure returns (uint256 y){
        require(prefix == 0x02 || prefix == 0x03, "invalid prefix");

        // x^3 + ax + b
        uint256 y2 = addmod(
            mulmod(_x, mulmod(_x, _x, P), P),
            addmod(mulmod(_x, A, P), B, P),
            P
        );
        y2 = expMod(y2, (P + 1) / 4, P);
        // uint256 cmp = yBit ^ y_ & 1;
        y = (y2 + prefix) % 2 == 0 ? y2 : P - y2;
    }

}

